'use client'

import { useState, useEffect } from 'react'
import { createQuest } from '@/app/actions'

interface Skill {
  id: string
  name: string
}

export default function CreateQuestForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])

  // 获取用户的所有技能
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills')
        if (response.ok) {
          const data = await response.json()
          setSkills(data)
        }
      } catch (error) {
        console.error('获取技能列表失败:', error)
      }
    }

    if (isOpen) {
      fetchSkills()
    }
  }, [isOpen])

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      await createQuest(formData)
      setIsOpen(false)
      // TODO: 重新验证页面数据
    } catch (error) {
      console.error('创建任务失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md font-medium"
      >
        + 创建新任务
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">创建新任务</h2>

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  任务标题 *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例如：完成项目报告"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  任务描述
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="描述任务的具体内容"
                />
              </div>

              <div>
                <label htmlFor="skillId" className="block text-sm font-medium text-gray-700 mb-1">
                  关联技能
                </label>
                <select
                  id="skillId"
                  name="skillId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">无关联技能</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  优先级
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="MEDIUM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="LOW">低</option>
                  <option value="MEDIUM">中</option>
                  <option value="HIGH">高</option>
                  <option value="URGENT">紧急</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50"
                >
                  {isLoading ? '创建中...' : '创建任务'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}


