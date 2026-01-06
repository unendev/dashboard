'use client';

import React, { ReactNode } from 'react';

interface CleanGridProps {
  children: ReactNode;
}

const CleanGrid: React.FC<CleanGridProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {children}
    </div>
  );
};

export default CleanGrid;



