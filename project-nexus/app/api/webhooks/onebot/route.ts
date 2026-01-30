import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 接收 NapCat (OneBot 11) 的 HTTP 上报
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Filter: Only interested in Group Messages for now
        if (body.post_type !== 'message' || body.message_type !== 'group') {
            return NextResponse.json({ status: 'ignored' });
        }

        // 2. Extract Key Info
        const groupId = body.group_id;
        const userId = body.user_id;
        // Try to get sender name, fallback to generic
        const senderName = body.sender?.card || body.sender?.nickname || 'Unknown QQ User';
        const rawContent = body.raw_message;
        const messageId = body.message_id?.toString();

        // 3. Basic Validation
        if (!rawContent) return NextResponse.json({ status: 'empty' });

        console.log(`[OneBot] Received msg from Group ${groupId}: ${rawContent.slice(0, 50)}...`);

        // 4. Transform to Nexus Format and Save to DB
        await prisma.nexusItem.upsert({
            where: {
                source_externalId: {
                    source: `QQ群 ${groupId}`,
                    externalId: messageId
                }
            },
            update: {
                content: rawContent
            },
            create: {
                source: `QQ群 ${groupId}`,
                sourceType: 'wool', // Default category: 'wool' (noise/chat)
                title: `${senderName}: ${rawContent.slice(0, 20)}...`,
                content: rawContent,
                link: '',
                externalId: messageId,
                authorName: senderName,
                authorAvatar: `http://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                publishedAt: new Date(body.time * 1000 || Date.now()),
                tags: ['QQ', `Group:${groupId}`],
                metadata: {
                    rawOneBot: {
                        sender: body.sender,
                        group_id: groupId
                    }
                }
            }
        });

        // Return empty object for OneBot standard response
        return NextResponse.json({}, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[OneBot] Error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
