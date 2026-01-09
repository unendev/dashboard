'use client'

import { TreasureList } from '../components/features/treasure/TreasureList'
import { useDevSession } from '../hooks/useDevSession'
import Link from 'next/link'
import { Columns } from 'lucide-react'

export default function TreasurePavilionPage() {
  // 使用开发会话，支持自动登录示例账户
  const { data: session, status } = useDevSession()

  return (
    <div className="treasure-page-layout">
      <div className="w-full container-padding py-8">
        {/* 视图切换按钮 */}
        <div className="flex justify-end mb-6 pr-4">
          <Link
            href="/treasure-pavilion/finder"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-lg hover:shadow-indigo-500/20 group"
          >
            <Columns size={18} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">进入层级视图</span>
          </Link>
        </div>

        {/* 宝藏列表 */}
        <TreasureList />
      </div>
    </div>
  )
}
