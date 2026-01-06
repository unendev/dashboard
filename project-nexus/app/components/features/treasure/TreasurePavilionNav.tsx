'use client'

import Link from 'next/link'
import { Box } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function TreasurePavilionNav() {
  const pathname = usePathname()

  return (
    <div className="sticky top-0 z-40 bg-[#1e293b] border-b border-white/10">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 py-3">
          <Link
            href="/treasure-pavilion"
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all bg-blue-500/20 text-blue-300 border border-blue-400/50"
          >
            <Box className="w-5 h-5" />
            <span className="text-base font-semibold">藏宝阁</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}













