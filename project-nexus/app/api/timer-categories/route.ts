import { NextResponse } from 'next/server';

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

const SCENES = ['工作', '生活', '维护', '探索'] as const;
const ACTIONS = ['产出', '输入', '协同', '执行', '运营', '恢复'] as const;
const OBJECTS = ['产品', '学业', '身体', '家庭', '关系', '资产', '系统', '内容', '行政', '认知'] as const;

function buildAxisCategories(): CategoryNode[] {
  return SCENES.map((scene) => ({
    id: `scene-${scene}`,
    name: scene,
    children: ACTIONS.map((action) => ({
      id: `scene-${scene}__action-${action}`,
      name: action,
      children: OBJECTS.map((obj) => ({
        id: `scene-${scene}__action-${action}__obj-${obj}`,
        name: obj,
      })),
    })),
  }));
}

/**
 * Timer 专用分类字典：固定三轴（场景/行为/对象）
 * - 不复用 log-categories，避免影响 Project Nexus 其它模块
 * - Timer 表单三列选择器直接消费该树
 */
export async function GET() {
  return NextResponse.json(buildAxisCategories());
}

