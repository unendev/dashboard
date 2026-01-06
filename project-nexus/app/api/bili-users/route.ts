import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BiliUser } from '@/types/bili-user';

// Bilibili API 响应数据类型
interface BiliUserInfo {
  name: string;
  sign?: string;
  face: string;
}

// 获取bilibili用户信息
async function getBiliUserInfo(uid: number): Promise<BiliUserInfo | null> {
  try {
    const response = await fetch(`https://api.bilibili.com/x/space/acc/info?mid=${uid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://space.bilibili.com/${uid}/`,
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get bili user info:', error);
    return null;
  }
}

// 读取配置文件
function readConfig(): BiliUser[] {
  try {
    const configPath = path.join(process.cwd(), 'config', 'bili-users.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to read config:', error);
    return [];
  }
}

// 写入配置文件
function writeConfig(users: BiliUser[]): boolean {
  try {
    const configPath = path.join(process.cwd(), 'config', 'bili-users.json');
    fs.writeFileSync(configPath, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write config:', error);
    return false;
  }
}

import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({ users: [] });
  }
  const users = readConfig();
  return NextResponse.json({ users });
}

// POST: 添加新UP主
export async function POST(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const { uid } = await request.json();

    if (!uid || typeof uid !== 'number') {
      return NextResponse.json({ error: 'Invalid UID' }, { status: 400 });
    }

    const users = readConfig();

    // 检查是否已存在
    if (users.some(user => user.uid === uid)) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // 获取用户信息
    const userInfo = await getBiliUserInfo(uid);
    if (!userInfo) {
      return NextResponse.json({ error: 'Failed to get user info' }, { status: 400 });
    }

    const newUser: BiliUser = {
      uid,
      name: userInfo.name,
      description: userInfo.sign || '',
      enabled: true,
      avatar: userInfo.face,
    };

    users.push(newUser);
    writeConfig(users);

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error('Failed to add bili user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 更新UP主配置
export async function PUT(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const { uid, enabled } = await request.json();
    const users = readConfig();

    const userIndex = users.findIndex(user => user.uid === uid);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users[userIndex].enabled = enabled;
    writeConfig(users);

    return NextResponse.json({ user: users[userIndex] });
  } catch (error) {
    console.error('Failed to update bili user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 删除UP主
export async function DELETE(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const { uid } = await request.json();
    const users = readConfig();

    const filteredUsers = users.filter(user => user.uid !== uid);
    if (filteredUsers.length === users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    writeConfig(filteredUsers);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bili user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
