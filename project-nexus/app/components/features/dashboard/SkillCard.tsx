'use client'

interface Skill {
  id: string
  name: string
  description?: string | null
  level: number
  experience: number
}

interface SkillCardProps {
  skill: Skill
  onLevelUp?: (skillId: string) => void
}

export default function SkillCard({ skill, onLevelUp }: SkillCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{skill.name}</h3>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
          Lv.{skill.level}
        </span>
      </div>

      {skill.description && (
        <p className="text-gray-600 mb-4">{skill.description}</p>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          经验值: {skill.experience}
        </div>
        <button
          onClick={() => onLevelUp?.(skill.id)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          升级
        </button>
      </div>
    </div>
  )
}


