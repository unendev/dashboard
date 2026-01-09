'use client';

import { ReactFlowProvider } from 'reactflow';
import { MillerLayout } from '@/app/components/features/finder/MillerLayout';

// Ensure we keep the route but swap the implementation.
// Keeping ReactFlowProvider just in case any sub-component accidentally needs context, 
// though MillerLayout doesn't use it.
export default function TreasureMindmapPage() {
  return (
    <div className="w-screen h-screen bg-[#0d1117] overflow-hidden">
      <MillerLayout />
    </div>
  );
}
