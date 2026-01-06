import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Type definitions for category structure
interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

interface DeleteRequest {
  type: 'top' | 'mid' | 'sub';
  path: string;
  name:string;
}

interface CreateRequest {
  type: 'top' | 'mid' | 'sub';
  parentPath?: string;
  name: string;
}

// Database category type
interface DatabaseCategory {
  id: string;
  name: string;
  parentId: string | null;
  children?: DatabaseCategory[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert database structure to frontend structure
function convertToFrontendStructure(categories: DatabaseCategory[]): CategoryNode[] {
  return categories.map((cat: DatabaseCategory) => ({
    id: cat.id,
    name: cat.name,
    children: cat.children ? convertToFrontendStructure(cat.children) : undefined
  }));
}

import { getUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json([]);
  }
  try {
    const categories = await prisma.logCategory.findMany({
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      where: {
        parentId: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    const frontendCategories = convertToFrontendStructure(categories);
    return NextResponse.json(frontendCategories);
  } catch (error) {
    console.error('Failed to read log categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const { type, parentPath, name } = await request.json() as CreateRequest;
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }
    
    let parentId: string | null = null;
    
    if (type === 'top') {
      // Create top-level category
      parentId = null;
    } else if (type === 'mid') {
      // Find parent top-level category
      const parentCategory = await prisma.logCategory.findFirst({
        where: {
          name: parentPath,
          parentId: null
        }
      });
      
      if (!parentCategory) {
        return NextResponse.json({ error: '父级分类不存在' }, { status: 400 });
      }
      
      parentId = parentCategory.id;
    } else if (type === 'sub') {
      // Find parent mid-level category
      const [topName, midName] = (parentPath || '').split('/');
      
      const topCategory = await prisma.logCategory.findFirst({
        where: {
          name: topName,
          parentId: null
        }
      });
      
      if (!topCategory) {
        return NextResponse.json({ error: '顶级分类不存在' }, { status: 400 });
      }
      
      const midCategory = await prisma.logCategory.findFirst({
        where: {
          name: midName,
          parentId: topCategory.id
        }
      });
      
      if (!midCategory) {
        return NextResponse.json({ error: '中级分类不存在' }, { status: 400 });
      }
      
      parentId = midCategory.id;
    }
    
    // Create the new category
    await prisma.logCategory.create({
      data: {
        name: name.trim(),
        parentId
      }
    });
    
    // Fetch updated categories
    const updatedCategories = await prisma.logCategory.findMany({
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      where: {
        parentId: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    const frontendCategories = convertToFrontendStructure(updatedCategories);
    
    return NextResponse.json({ success: true, categories: frontendCategories });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper function to get all descendant IDs using an iterative approach
async function getAllDescendantIds(categoryId: string, prismaClient: typeof prisma): Promise<string[]> {
  const allIds: string[] = [];
  const queue: string[] = [categoryId];
  const visited: Set<string> = new Set();
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);
    allIds.push(currentId);
    
    const children = await prismaClient.logCategory.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });
    
    for (const child of children) {
      if (!visited.has(child.id)) {
        queue.push(child.id);
      }
    }
  }
  
  return allIds;
}

export async function DELETE(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const body = await request.json();
    console.log('DELETE request body:', body);
    
    const { type, path: categoryPath, name } = body as DeleteRequest;
    
    if (!type || !name) {
      console.error('Missing required fields:', { type, name });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    let categoryToDelete: { id: string; name: string } | null = null;
    
    if (type === 'top') {
      // Delete top-level category
      categoryToDelete = await prisma.logCategory.findFirst({
        where: {
          name: name,
          parentId: null
        },
        select: { id: true, name: true },
      });
    } else if (type === 'mid') {
      // Delete mid-level category - categoryPath is the top category name
      const topCategory = await prisma.logCategory.findFirst({
        where: {
          name: categoryPath,
          parentId: null
        }
      });
      
      if (!topCategory) {
        return NextResponse.json({ error: '顶级分类不存在' }, { status: 400 });
      }
      
      categoryToDelete = await prisma.logCategory.findFirst({
        where: {
          name: name,
          parentId: topCategory.id
        },
        select: { id: true, name: true },
      });
    } else if (type === 'sub') {
      // Delete sub-level category - categoryPath is "topName/midName"
      const [topName, midName] = categoryPath.split('/');
      
      const topCategory = await prisma.logCategory.findFirst({
        where: {
          name: topName,
          parentId: null
        }
      });
      
      if (!topCategory) {
        return NextResponse.json({ error: '顶级分类不存在' }, { status: 400 });
      }
      
      const midCategory = await prisma.logCategory.findFirst({
        where: {
          name: midName,
          parentId: topCategory.id
        }
      });
      
      if (!midCategory) {
        return NextResponse.json({ error: '中级分类不存在' }, { status: 400 });
      }
      
      categoryToDelete = await prisma.logCategory.findFirst({
        where: {
          name: name,
          parentId: midCategory.id
        },
        select: { id: true, name: true },
      });
    } else {
      console.error('Invalid delete type:', type);
      return NextResponse.json({ error: 'Invalid delete type' }, { status: 400 });
    }
    
    if (!categoryToDelete) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }
    
    // Get all descendant IDs including the category itself
    const idsToDelete = await getAllDescendantIds(categoryToDelete.id, prisma);
    
    // Delete the category and all its descendants in a single, efficient operation
    await prisma.logCategory.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });

    console.log('Deleted category and its children:', categoryToDelete.name);
    
    // Fetch updated categories
    const updatedCategories = await prisma.logCategory.findMany({
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      where: {
        parentId: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    const frontendCategories = convertToFrontendStructure(updatedCategories);
    
    return NextResponse.json({ success: true, categories: frontendCategories });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
