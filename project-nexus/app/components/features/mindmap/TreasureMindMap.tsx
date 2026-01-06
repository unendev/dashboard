'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import dagre from 'dagre'

interface Treasure {
  id: string
  title: string
  content?: string | null
  type: string
  tags: string[]
  createdAt: string | Date
}

interface TreasureMindMapProps {
  treasures: Treasure[]
}

// 自定义节点组件
function TreasureNode({ data }: { data: { label: string; type?: string; count?: number; treasures?: unknown[]; createdAt?: string; title?: string; content?: string; tags?: string[] } }) {
  const typeIcons = {
    TEXT: '📝',
    IMAGE: '🖼️',
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{typeIcons[data.type as keyof typeof typeIcons] || '📄'}</span>
        <span className="text-xs text-white/40">
          {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : ''}
        </span>
      </div>

      <div className="font-semibold text-white text-sm mb-2 line-clamp-2">
        {data.title || '无标题'}
      </div>

      {data.content && (
        <div className="text-xs text-white/60 line-clamp-2 mb-3">
          {data.content}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {data.tags?.slice(0, 3).map((tag: string) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/70"
          >
            {tag}
          </span>
        ))}
        {data.tags && data.tags.length > 3 && (
          <span className="text-xs text-white/40">+{data.tags.length - 3}</span>
        )}
      </div>
    </div>
  )
}

// 数据转换：宝藏 → 图节点
function treasuresToGraphData(treasures: Treasure[]) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 创建节点
  treasures.forEach(treasure => {
    nodes.push({
      id: treasure.id,
      type: 'treasureNode',
      data: treasure,
      position: { x: 0, y: 0 }
    })
  })

  // 创建边：基于标签关联
  const tagMap = new Map<string, string[]>()
  treasures.forEach(t => {
    t.tags.forEach(tag => {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag)!.push(t.id)
    })
  })

  tagMap.forEach(treasureIds => {
    if (treasureIds.length > 1) {
      // 同标签的宝藏互相连接（只连接相邻的，避免过多边）
      for (let i = 0; i < treasureIds.length - 1; i++) {
        edges.push({
          id: `${treasureIds[i]}-${treasureIds[i + 1]}`,
          source: treasureIds[i],
          target: treasureIds[i + 1],
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2 }
        })
      }
    }
  })

  return { nodes, edges }
}

// 自动布局
function autoLayout(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: 'TB',
    align: 'UL',
    nodesep: 100,
    ranksep: 150
  })

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: 280, height: 150 })
  })

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  return nodes.map(node => {
    const position = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: position.x - 140,
        y: position.y - 75
      }
    }
  })
}

export function TreasureMindMap({ treasures }: TreasureMindMapProps) {
  const router = useRouter()

  const initialData = useMemo(() => {
    if (treasures.length === 0) {
      return { nodes: [], edges: [] }
    }
    const { nodes, edges } = treasuresToGraphData(treasures)
    return {
      nodes: autoLayout(nodes, edges),
      edges
    }
  }, [treasures])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges)

  const nodeTypes = useMemo(() => ({
    treasureNode: TreasureNode
  }), [])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    window.open(`/treasure-pavilion?id=${node.id}`, '_blank')
  }, [])

  const resetLayout = () => {
    const { nodes: newNodes, edges: newEdges } = treasuresToGraphData(treasures)
    setNodes(autoLayout(newNodes, newEdges))
    setEdges(newEdges)
  }

  return (
    <div className="w-full h-screen bg-black relative">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-white/60">
              {nodes.length} 个宝藏 · {edges.length} 个连接
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={resetLayout}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重置布局
            </Button>
          </div>
        </div>
      </div>

      {treasures.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-white/60">
            <p className="text-lg mb-2">暂无宝藏数据</p>
            <p className="text-sm">创建一些宝藏后再查看思维导图</p>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="pt-20"
        >
          <Background
            color="#ffffff20"
            gap={16}
            size={1}
            variant={BackgroundVariant.Dots}
          />

          <Controls className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg" />

          <MiniMap
            className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg"
            nodeColor={() => '#8b5cf6'}
          />
        </ReactFlow>
      )}
    </div>
  )
}







