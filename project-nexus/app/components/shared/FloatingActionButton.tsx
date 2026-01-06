'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  onCreateTreasure: () => void
  className?: string
}

export function FloatingActionButton({ 
  onCreateTreasure, 
  className 
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onCreateTreasure}
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "w-14 h-14 bg-blue-500 hover:bg-blue-600",
        "rounded-full flex items-center justify-center",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900",
        "sm:bottom-6 sm:right-6",
        className
      )}
      title="创建宝藏"
      aria-label="创建宝藏"
    >
      <Plus className="h-6 w-6 text-white" />
    </button>
  )
}



