'use client'

import React from 'react';

interface SunburstData {
  name: string;
  value: number;
  children?: SunburstData[];
  color?: string;
}

interface SunburstChartProps {
  data: SunburstData;
  width?: number;
  height?: number;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B',
  '#8DD1E1', '#82CA9D', '#FFC658', '#FF6B6B'
];

const SunburstChart: React.FC<SunburstChartProps> = ({ 
  data, 
  width = 400, 
  height = 400 
}) => {
  const [selectedNode, setSelectedNode] = React.useState<SunburstData | null>(null);
  const [hoveredNode, setHoveredNode] = React.useState<SunburstData | null>(null);
  const [currentView, setCurrentView] = React.useState<SunburstData>(data);

  // 计算总值
  const calculateTotalValue = (node: SunburstData): number => {
    if (!node.children || node.children.length === 0) {
      return node.value;
    }
    return node.children.reduce((sum, child) => sum + calculateTotalValue(child), 0);
  };

  // 生成旭日图路径
  const generateSunburstPaths = (
    node: SunburstData,
    x0: number,
    y0: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    depth: number = 0,
    colorIndex: number = 0
  ): Array<{
    path: string;
    node: SunburstData;
    centerX: number;
    centerY: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    depth: number;
    color: string;
  }> => {
    const paths: Array<{
      path: string;
      node: SunburstData;
      centerX: number;
      centerY: number;
      radius: number;
      startAngle: number;
      endAngle: number;
      depth: number;
      color: string;
    }> = [];

    const totalValue = calculateTotalValue(node);
    const angleRange = endAngle - startAngle;
    
    // 为当前节点创建路径
    const innerRadius = depth * (radius / 4);
    const outerRadius = (depth + 1) * (radius / 4);
    
    const startRad = startAngle * Math.PI / 180;
    const endRad = endAngle * Math.PI / 180;
    
    const x1 = x0 + innerRadius * Math.cos(startRad);
    const y1 = y0 + innerRadius * Math.sin(startRad);
    const x2 = x0 + outerRadius * Math.cos(startRad);
    const y2 = y0 + outerRadius * Math.sin(startRad);
    const x3 = x0 + outerRadius * Math.cos(endRad);
    const y3 = y0 + outerRadius * Math.sin(endRad);
    const x4 = x0 + innerRadius * Math.cos(endRad);
    const y4 = y0 + innerRadius * Math.sin(endRad);
    
    // 确保所有坐标都是有效数字
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(x3) || isNaN(y3) || isNaN(x4) || isNaN(y4)) {
      return paths;
    }
    
    const largeArcFlag = angleRange > 180 ? 1 : 0;
    
    const path = [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
      'Z'
    ].join(' ');

    const color = node.color || COLORS[colorIndex % COLORS.length];
    
    paths.push({
      path,
      node,
      centerX: x0,
      centerY: y0,
      radius: outerRadius,
      startAngle,
      endAngle,
      depth,
      color
    });

    // 为子节点创建路径
    if (node.children && node.children.length > 0) {
      let currentAngle = startAngle;
      node.children.forEach((child, index) => {
        const childValue = calculateTotalValue(child);
        const childAngleRange = (childValue / totalValue) * angleRange;
        const childEndAngle = currentAngle + childAngleRange;
        
        const childPaths = generateSunburstPaths(
          child,
          x0,
          y0,
          radius,
          currentAngle,
          childEndAngle,
          depth + 1,
          colorIndex + index + 1
        );
        
        paths.push(...childPaths);
        currentAngle = childEndAngle;
      });
    }

    return paths;
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  
  // 确保数据有效
  if (!currentView || !currentView.children || currentView.children.length === 0) {
    return (
      <div className="relative">
        <svg width={width} height={height} className="mx-auto">
          <g>
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="16"
              fill="#666"
            >
              暂无数据
            </text>
          </g>
        </svg>
      </div>
    );
  }
  
  const paths = generateSunburstPaths(currentView, centerX, centerY, radius, 0, 360);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const handlePathClick = (node: SunburstData) => {
    if (node.children && node.children.length > 0) {
      // 如果有子节点，切换到该节点的视图
      setCurrentView(node);
    } else {
      // 如果没有子节点，切换选中状态
      setSelectedNode(selectedNode?.name === node.name ? null : node);
    }
  };

  const handleCenterClick = () => {
    // 点击中心区域回到上一级
    if (currentView !== data) {
      // 找到当前视图的父节点
      const findParent = (node: SunburstData, target: SunburstData): SunburstData | null => {
        if (node.children) {
          for (const child of node.children) {
            if (child === target) {
              return node;
            }
            const parent = findParent(child, target);
            if (parent) return parent;
          }
        }
        return null;
      };
      
      const parent = findParent(data, currentView);
      setCurrentView(parent || data);
    }
  };

  const handlePathMouseEnter = (node: SunburstData) => {
    setHoveredNode(node);
  };

  const handlePathMouseLeave = () => {
    setHoveredNode(null);
  };

  return (
    <div className="relative">
      <svg width={width} height={height} className="mx-auto">
        <g>
          {/* 中心点击区域 */}
          {currentView !== data && (
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.3}
              fill="rgba(255,255,255,0.1)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onClick={handleCenterClick}
            />
          )}
          {paths.map((pathData, index) => (
            <g key={index}>
              <path
                d={pathData.path}
                fill={pathData.color}
                stroke="#fff"
                strokeWidth={1}
                opacity={hoveredNode?.name === pathData.node.name ? 0.8 : 0.6}
                style={{ cursor: 'pointer' }}
                onClick={() => handlePathClick(pathData.node)}
                onMouseEnter={() => handlePathMouseEnter(pathData.node)}
                onMouseLeave={handlePathMouseLeave}
              />
              {/* 添加文本标签 */}
              {pathData.node.children && pathData.node.children.length === 0 && (
                (() => {
                  const midAngle = (pathData.startAngle + pathData.endAngle) / 2;
                  const textRadius = pathData.radius * 0.7;
                  const textX = centerX + textRadius * Math.cos(midAngle * Math.PI / 180);
                  const textY = centerY + textRadius * Math.sin(midAngle * Math.PI / 180);
                  
                  // 确保坐标是有效数字
                  if (isNaN(textX) || isNaN(textY)) {
                    return null;
                  }
                  
                  return (
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fill="#fff"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {pathData.node.name.length > 8 ? 
                        pathData.node.name.substring(0, 8) + '...' : 
                        pathData.node.name
                      }
                    </text>
                  );
                })()
              )}
            </g>
          ))}
        </g>
      </svg>
      
      {/* 悬停提示 */}
      {hoveredNode && (
        <div className="absolute bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs z-10"
             style={{
               left: Math.min(width - 200, Math.max(0, centerX - 100)),
               top: Math.min(height - 100, Math.max(0, centerY - 50))
             }}>
          <p className="font-medium text-gray-800">{hoveredNode.name}</p>
          <p className="text-blue-600 font-semibold">
            {formatTime(Math.round(hoveredNode.value / 60))}
          </p>
          {hoveredNode.children && hoveredNode.children.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              <p className="font-medium">包含子项:</p>
              {hoveredNode.children.slice(0, 3).map((child, index) => (
                <p key={index} className="ml-2">• {child.name}</p>
              ))}
              {hoveredNode.children.length > 3 && (
                <p className="ml-2 text-gray-400">...还有 {hoveredNode.children.length - 3} 项</p>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>点击扇形区域进入该类别，点击中心区域返回上一级</p>
        <p className="text-xs text-gray-500 mt-1">当前查看: {currentView.name}</p>
      </div>
    </div>
  );
};

export default SunburstChart;



