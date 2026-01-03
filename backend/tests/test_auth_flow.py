import pytest
from httpx import AsyncClient
from sqlmodel import select
from app.models import User
from app.auth import get_password_hash
import uuid

@pytest.mark.asyncio
async def test_password_reset_flow(client: AsyncClient, db_session):
    session = db_session
    # 1. Create User
    email = "reset@example.com"
    old_pass = "oldpass"
    user = User(id=str(uuid.uuid4()), email=email, hashed_password=get_password_hash(old_pass))
    session.add(user)
    await session.commit()

    # 2. Request Reset (Forgot Password)
    response = await client.post("/auth/forgot-password", json={"email": email})
    assert response.status_code == 200
    
    from app.auth import create_password_reset_token
    token = create_password_reset_token(email)

    # 3. Reset Password
    new_pass = "newpass"
    response = await client.post("/auth/reset-password", json={"token": token, "new_password": new_pass})
    assert response.status_code == 200

    # 4. Verify login with new password
    await session.refresh(user)
    from app.auth import verify_password
    assert verify_password(new_pass, user.hashed_password)
