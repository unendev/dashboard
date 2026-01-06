'use client'

import React from 'react'

interface DashboardLayoutManagerProps {
  children: React.ReactNode
}

export default function DashboardLayoutManager({ children }: DashboardLayoutManagerProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}


