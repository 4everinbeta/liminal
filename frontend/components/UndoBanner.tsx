import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { updateTask, restoreTask } from '@/lib/api';
import { RotateCcw, X } from 'lucide-react';

const UNDO_WINDOW_MS = 30000;

export const UndoBanner: React.FC = () => {
  const { 
    lastCompletedTask, 
    setLastCompletedTask, 
    lastDeletedTask, 
    setLastDeletedTask,
    triggerUpdate 
  } = useAppStore();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const now = Date.now();
      let visible = false;

      if (lastCompletedTask && (now - lastCompletedTask.timestamp) < UNDO_WINDOW_MS) {
        visible = true;
      } else if (lastCompletedTask) {
        setLastCompletedTask(null);
      }

      if (lastDeletedTask && (now - lastDeletedTask.timestamp) < UNDO_WINDOW_MS) {
        visible = true;
      } else if (lastDeletedTask) {
        setLastDeletedTask(null);
      }

      setIsVisible(visible);
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 1000);
    return () => clearInterval(interval);
  }, [lastCompletedTask, lastDeletedTask, setLastCompletedTask, setLastDeletedTask]);

  const handleUndoComplete = async () => {
    if (!lastCompletedTask) return;
    try {
      await updateTask(lastCompletedTask.task.id, { status: lastCompletedTask.task.status });
      setLastCompletedTask(null);
      triggerUpdate();
    } catch (err) {
      console.error('Undo completion failed', err);
    }
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedTask) return;
    try {
      await restoreTask(lastDeletedTask.task.id);
      setLastDeletedTask(null);
      triggerUpdate();
    } catch (err) {
      console.error('Undo deletion failed', err);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-lg">
            <RotateCcw size={18} className="text-primary" />
          </div>
          <span className="text-sm font-medium">
            {lastCompletedTask ? 'Task completed' : 'Task removed'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={lastCompletedTask ? handleUndoComplete : handleUndoDelete}
            className="text-sm font-bold text-primary hover:text-primary/80 px-3 py-1 rounded-lg transition-colors"
          >
            UNDO
          </button>
          <button
            onClick={() => {
              setLastCompletedTask(null);
              setLastDeletedTask(null);
            }}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
