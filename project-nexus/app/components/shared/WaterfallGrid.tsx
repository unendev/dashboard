'use client';

import React, { useEffect, useRef, useState, useCallback, ReactNode } from 'react';

interface WaterfallGridProps {
  children: ReactNode;
  minColumnWidth?: number; // 最小列宽，单位px
  gap?: number; // 间距，单位px
}

const WaterfallGrid: React.FC<WaterfallGridProps> = ({
  children,
  minColumnWidth = 300,
  gap = 16,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  const calculateColumnCount = useCallback(() => {
    if (gridRef.current) {
      const containerWidth = gridRef.current.offsetWidth;
      const newColumnCount = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
      setColumnCount(newColumnCount);
    }
  }, [minColumnWidth, gap]);

  useEffect(() => {
    calculateColumnCount();
    window.addEventListener('resize', calculateColumnCount);
    return () => window.removeEventListener('resize', calculateColumnCount);
  }, [minColumnWidth, gap, calculateColumnCount]);

  const columns: ReactNode[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights: number[] = Array.from({ length: columnCount }, () => 0);

  React.Children.forEach(children, (child, index) => {
    if (React.isValidElement(child)) {
      const minHeightColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      columns[minHeightColumnIndex].push(
        <div key={child.key || index} style={{ marginBottom: `${gap}px` }}>
          {child}
        </div>
      );
      // 估算子组件高度，根据不同的组件类型设置不同的高度
      let estimatedHeight = minColumnWidth * 0.75; // 默认高度
      
      // 根据组件类型调整高度估算
      if (child.key === 'ruanyifeng' || child.key === 'bilibili') {
        estimatedHeight = minColumnWidth * 1.2; // 内容卡片较高
      } else if (child.key === 'linuxdo') {
        estimatedHeight = minColumnWidth * 0.8; // Linux.do组件中等高度
      }
      
      columnHeights[minHeightColumnIndex] += estimatedHeight + gap;
    }
  });

  return (
    <div
      ref={gridRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: `${gap}px`,
        padding: `${gap}px`,
        alignItems: 'flex-start', // 确保内容从顶部开始对齐
      }}
    >
      {columns.map((col, colIndex) => (
        <div key={colIndex} style={{ display: 'flex', flexDirection: 'column' }}>
          {col}
        </div>
      ))}
    </div>
  );
};

export default WaterfallGrid;

