import asyncio
from datetime import datetime, timedelta
from typing import List
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Task, TaskStatus, ChatSession, User
from .. import crud
from ..websockets import manager

class TaskMonitor:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def start(self):
        print("Task Monitor: Started")
        while True:
            try:
                await self.check_deadlines()
            except Exception as e:
                print(f"Task Monitor Error: {e}")
            
            # Check every hour
            await asyncio.sleep(3600)

    async def check_deadlines(self):
        async with self.session_factory() as session:
            # Find tasks due within 24 hours or overdue, that are not done
            now = datetime.utcnow()
            threshold = now + timedelta(hours=24)
            
            statement = (
                select(Task)
                .where(Task.status != TaskStatus.done)
                .where(Task.due_date != None)
                .where(Task.due_date <= threshold)
            )
            
            result = await session.execute(statement)
            tasks = result.scalars().all()
            
            # Group by User to minimize chat session lookups
            tasks_by_user = {}
            for task in tasks:
                if task.user_id not in tasks_by_user:
                    tasks_by_user[task.user_id] = []
                tasks_by_user[task.user_id].append(task)
            
            for user_id, user_tasks in tasks_by_user.items():
                await self.alert_user(session, user_id, user_tasks)

    async def alert_user(self, session: AsyncSession, user_id: str, tasks: List[Task]):
        # Find latest chat session
        statement = (
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc())
            .limit(1)
        )
        result = await session.execute(statement)
        chat_session = result.scalar_one_or_none()
        
        if not chat_session:
            # Create one if needed, though rare for active users
            chat_session = await crud.create_chat_session(session, user_id, "System Alerts")

        # Construct Alert Message
        overdue = [t for t in tasks if t.due_date < datetime.utcnow()]
        due_soon = [t for t in tasks if t.due_date >= datetime.utcnow()]
        
        lines = []
        if overdue:
            lines.append(f"🚨 **Overdue Tasks:**")
            for t in overdue:
                lines.append(f"- {t.title} (Due: {t.due_date.strftime('%Y-%m-%d %H:%M')})")
        
        if due_soon:
            lines.append(f"⏰ **Due Soon (<24h):**")
            for t in due_soon:
                lines.append(f"- {t.title} (Due: {t.due_date.strftime('%H:%M')})")
        
        if not lines:
            return

        message_content = "\n".join(lines)

        # Check if we recently alerted to avoid spam?
        # For MVP, we'll just alert. In prod, check last alert timestamp.

        await crud.add_chat_message(session, chat_session.id, "assistant", message_content)
        await manager.broadcast("refresh", user_id) # Notify frontend to refresh chat/tasks
