'use client'

import { updateQuestStatus } from '@/app/actions'

interface Quest {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  skill?: {
    id: string
    name: string
  } | null
}

interface QuestCardProps {
  quest: Quest
}

export default function QuestCard({ quest }: QuestCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateQuestStatus(quest.id, newStatus)
    } catch (error) {
      console.error('更新任务状态失败:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 flex-1">{quest.title}</h3>
        <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(quest.priority)}`}>
          {quest.priority}
        </span>
      </div>

      {quest.description && (
        <p className="text-gray-600 text-sm mb-3">{quest.description}</p>
      )}

      {quest.skill && (
        <div className="text-xs text-blue-600 mb-3">
          关联技能: {quest.skill.name}
        </div>
      )}

      <div className="flex space-x-2">
        {quest.status !== 'PLANNING' && (
          <button
            onClick={() => handleStatusChange('PLANNING')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            计划
          </button>
        )}
        {quest.status !== 'IN_PROGRESS' && (
          <button
            onClick={() => handleStatusChange('IN_PROGRESS')}
            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
          >
            开始
          </button>
        )}
        {quest.status !== 'COMPLETED' && (
          <button
            onClick={() => handleStatusChange('COMPLETED')}
            className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-green-700"
          >
            完成
          </button>
        )}
      </div>
    </div>
  )
}


