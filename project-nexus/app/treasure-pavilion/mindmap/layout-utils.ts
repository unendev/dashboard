// app/components/features/mindmap/layout-utils.ts

import {
  Node,
  Edge,
  Position,
} from 'reactflow';
import dagre from 'dagre';
import * as d3 from 'd3-force';

// Helper for timestamp extraction
const getNodeTimestamp = (node: Node, fallbackIndex: number): number => {
  const data = node.data as { createdAt?: string | number; firstSeenAt?: string | number };
  const raw = data?.createdAt ?? data?.firstSeenAt;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now() - fallbackIndex * 1000;
};

// 用于 Dagre 布局的节点宽度和高度（简化处理，实际应根据内容动态计算）
const NODE_WIDTH = 200;
const NODE_HEIGHT = 50;

/**
 * Dagre 层级布局函数
 * @param nodes ReactFlow 节点
 * @param edges ReactFlow 边
 * @param direction 布局方向 (TB: Top-Bottom, LR: Left-Right)
 * @returns 带有位置信息的新节点数组
 */
export const getHierarchicalLayout = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): Node[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return layoutNodes;
};

/**
 * d3-force 力导向布局函数 (Enhanced for Themes)
 * @param nodes ReactFlow 节点
 * @param edges ReactFlow 边
 * @returns 带有位置信息的新节点数组
 */
// Galaxy Density Config
const GALAXY_DENSITY = {
  FORCE_DISTANCE: 40,
  FORCE_CHARGE: -80,
  TIMELINE_WIDTH_PER_NODE: 40,
  TIMELINE_HEIGHT_SPREAD: 300,
  SPIRAL_RADIUS_FACTOR: 8
};

export const getForceDirectedLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink<Node, Edge>(edges)
        .id((d: any) => d.id)
        .distance(GALAXY_DENSITY.FORCE_DISTANCE) // Reduced from 150
        .strength(0.5)
    )
    .force('charge', d3.forceManyBody().strength(GALAXY_DENSITY.FORCE_CHARGE))
    .force('center', d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide(20).strength(0.8)) // Reduced collision radius
    .stop();

  for (let i = 0; i < 300; ++i) simulation.tick();

  return nodes.map((node) => ({
    ...node,
    position: { x: node.x || 0, y: node.y || 0 },
    data: { ...node.data, viewMode: 'galaxy' } // Add viewMode marker
  }));
};

export const getTimelineLayout = (nodes: Node[]): Node[] => {
  if (nodes.length === 0) return nodes;

  const timeline = nodes.map((node, index) => ({
    node,
    index,
    timestamp: getNodeTimestamp(node, index),
  })).sort((a, b) => a.timestamp - b.timestamp);

  // Grid Configuration
  const COL_WIDTH = 250; // Width per Month/Year column
  const ROW_HEIGHT = 80; // Height per node item
  const BASE_Y = 0;

  // Group by Period (Year-Month)
  const groups = new Map<string, typeof timeline>();
  timeline.forEach(item => {
    const d = new Date(item.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`; // "2024-1", "2024-2"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });

  // Sort keys chronologically
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const [y1, m1] = a.split('-').map(Number);
    const [y2, m2] = b.split('-').map(Number);
    return (y1 * 12 + m1) - (y2 * 12 + m2);
  });

  let currentX = 0;
  const layoutedNodes: Node[] = [];

  sortedKeys.forEach(key => {
    const items = groups.get(key)!;
    // Categorize by theme for Y-axis splitting?
    // For now, simple vertical stack to ensure reviewability

    items.forEach((item, idx) => {
      layoutedNodes.push({
        ...item.node,
        position: {
          x: currentX + 15, // Center in 250px column (220px node width)
          y: BASE_Y + (idx * ROW_HEIGHT)
        },
        data: { ...item.node.data, viewMode: 'timeline' }
      });
    });

    // Move X forward for next column
    currentX += COL_WIDTH;
  });

  return layoutedNodes;
};

// Taxonomy Layout (Radial Tree)
export const getTaxonomyLayout = (nodes: Node[], tagHierarchy: Map<string, any>): Node[] => {
  if (nodes.length === 0) return [];

  // We need to build a true tree structure from the tagHierarchy
  // 1. Identify Root Tags
  // 2. Assign Treasures to their specific Tag Node (Leaf)

  // Since `tagHierarchy` is passed from page.tsx (we need to update the signature),
  // But wait, `getTaxonomyLayout` currently doesn't receive `tagHierarchy`.
  // We should construct it from node data if possible, or pass it in.
  // Actually, page.tsx has `tagHierarchy`. We should update the call site.

  // For now, let's assume we receive `nodes` which includes both 'tag' and 'treasure' types.
  // The 'tag' nodes are created in `transformDataForInitialView`.

  const tagNodes = nodes.filter(n => n.type === 'tag');
  const treasureNodes = nodes.filter(n => n.type === 'treasure');

  // Simple Radial Layout
  // Center: Root Tags
  // Outer Layers: Child Tags
  // Periphery: Treasures

  // Filter root tags
  const rootTags = tagNodes.filter(n => !n.data.fullPath.includes('/'));

  // Map parent-child relationships
  const parentMap = new Map<string, string>(); // childId -> parentId
  tagNodes.forEach(tag => {
    // Find parent path
    const parts = tag.data.fullPath.split('/');
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/');
      const parentNode = tagNodes.find(n => n.data.fullPath === parentPath);
      if (parentNode) {
        parentMap.set(tag.id, parentNode.id);
      }
    }
  });

  // Assign treasures to tags
  const treasureMap = new Map<string, string[]>(); // tagId -> treasureIds
  treasureNodes.forEach(t => {
    // Find which tag it belongs to.
    // t.data.tags is an array of paths.
    // We pick the first one for primary layout?
    // Or we look at `t.data.mainTag` if we had it.
    // Let's us the first tag in the list.
    if (t.data.tags && t.data.tags.length > 0) {
      const tagPath = t.data.tags[0];
      const tagId = `tag-${tagPath}`;
      if (!treasureMap.has(tagId)) treasureMap.set(tagId, []);
      treasureMap.get(tagId)!.push(t.id);
    } else {
      // Unclassified
      if (!treasureMap.has('root')) treasureMap.set('root', []);
      treasureMap.get('root')!.push(t.id);
    }
  });

  // Re-use d3-hierarchy logic ideally, but let's do a simple concentric circle for now.
  // Layer 0: Root Tags (Radius 200)
  // Layer 1: Child Tags (Radius 500)
  // Layer 2: Treasures (Radius 800+)

  const layoutedNodes: Node[] = [];
  const CENTER = { x: 0, y: 0 };

  // 1. Place Root Tags
  const rootCount = rootTags.length;
  const rootAngleStep = (Math.PI * 2) / Math.max(1, rootCount);

  rootTags.forEach((node, i) => {
    const angle = i * rootAngleStep;
    layoutedNodes.push({
      ...node,
      position: {
        x: Math.cos(angle) * 300,
        y: Math.sin(angle) * 300
      },
      data: { ...node.data, viewMode: 'taxonomy', depth: 0 }
    });
  });

  // 2. Place Child Tags (Grouping them near parents if possible, or just next layer)
  // For simplicity in this "Review" view, we will just blast them in a bigger circle for now,
  // sorted by their parent's angle?

  // A better approach for "Review" is a Tidy Tree (Dendrogram) from Left to Right.
  // Left: Roots. Right: Leaves.
  // Let's try that. It's much more readable for "Reviewing" text.

  // Switching to DAGRE-like Tree (Horizontal)
  // We can re-use `getHierarchicalLayout` but with specific settings?
  // No, let's write a dedicated simple Tree logic.

  let currentY = 0;
  const Y_GAP = 60;
  const X_LAYER = 400;

  // DFS Traversal to layout linearly
  const processTag = (tagId: string, depth: number) => {
    const node = tagNodes.find(n => n.id === tagId);
    if (!node) return;

    // Place Tag
    // Calculate Y based on total children size?
    // Simple DFS list placement:

    const myY = currentY;

    // Process children tags first? No, process treasures first, then children tags?
    const myTreasures = treasureMap.get(tagId) || [];
    const childrenTags = tagNodes.filter(n => parentMap.get(n.id) === tagId);

    // Calculate subtree size to center parent?
    // Let's just list them top-down for "Review" scanning.

    layoutedNodes.push({
      ...node,
      position: { x: depth * X_LAYER, y: myY },
      data: { ...node.data, viewMode: 'taxonomy' }
    });
    currentY += Y_GAP;

    // Layout Treasures immediately below/indent?
    // Or to the right? To the right is better (Leaf nodes).
    myTreasures.forEach((tid, i) => {
      const tNode = treasureNodes.find(n => n.id === tid);
      if (tNode) {
        layoutedNodes.push({
          ...tNode,
          position: { x: (depth + 1) * X_LAYER, y: currentY },
          data: { ...tNode.data, viewMode: 'taxonomy' }
        });
        currentY += Y_GAP;
      }
    });

    // Recurse
    childrenTags.forEach(child => processTag(child.id, depth + 1));
  };

  rootTags.forEach(root => processTag(root.id, 0));

  // Handle Unclassified (if any)
  if (treasureMap.has('root')) {
    const orphans = treasureMap.get('root')!;
    orphans.forEach(tid => {
      const tNode = treasureNodes.find(n => n.id === tid);
      if (tNode) {
        layoutedNodes.push({
          ...tNode,
          position: { x: 0, y: currentY },
          data: { ...tNode.data, viewMode: 'taxonomy', isOrphan: true }
        });
        currentY += Y_GAP;
      }
    });
  }

  return layoutedNodes;
};
