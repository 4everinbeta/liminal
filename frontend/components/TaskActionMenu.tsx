'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Trash2, Edit2, ArrowUpCircle, ArrowDownCircle, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TaskActionMenuProps {
  onDelete?: () => void
  onEdit?: () => void
  onToggleComplete?: () => void
  onPause?: () => void
  isCompleted?: boolean
  isPaused?: boolean
}

export default function TaskActionMenu({ onDelete, onEdit, onToggleComplete, onPause, isCompleted, isPaused }: TaskActionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-primary/20">
          <MoreHorizontal size={18} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[160px] bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right"
          sideOffset={5}
          align="end"
        >
          {onToggleComplete && (
            <DropdownMenu.Item
              onSelect={onToggleComplete}
              className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none"
            >
              <CheckCircle size={14} className={isCompleted ? "text-green-600" : "text-gray-400"} />
              {isCompleted ? 'Mark Active' : 'Complete'}
            </DropdownMenu.Item>
          )}

          {onPause && !isCompleted && (
            <DropdownMenu.Item
              onSelect={onPause}
              className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none"
            >
              <ArrowDownCircle size={14} className={isPaused ? "text-orange-600" : "text-gray-400"} />
              {isPaused ? 'Resume Task' : 'Pause Task'}
            </DropdownMenu.Item>
          )}
          
          {onEdit && (
            <DropdownMenu.Item
              onSelect={onEdit}
              className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none"
            >
              <Edit2 size={14} />
              Edit
            </DropdownMenu.Item>
          )}

          {onDelete && (
            <>
              <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
              <DropdownMenu.Item
                onSelect={onDelete}
                className="flex items-center gap-2 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer outline-none"
              >
                <Trash2 size={14} />
                Delete
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
