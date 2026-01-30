import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeNexusItem } from '@/lib/nexus-ai';

// Use SUPER_ADMIN_KEY for simplicity in this hybrid setup
const INGEST_SECRET = process.env.SUPER_ADMIN_KEY || 'dev-super-admin-2024';

export async function POST(req: Request) {
    try {
        // 1. Auth Check
        const authHeader = req.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${INGEST_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await req.json();
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ message: 'No items to process' });
        }

        const results = {
            total: items.length,
            success: 0,
            failed: 0,
            errors: [] as string[],
            aiProcessed: 0
        };

        // 3. Process Items (AI Analysis -> Upsert)
        const promises = items.map(async (item: any) => {
            try {
                // Validate required fields
                if (!item.source || !item.sourceType) {
                    throw new Error('Missing source or sourceType');
                }

                const externalId = item.externalId || item.link || Buffer.from(item.content || '').toString('base64').slice(0, 32);

                // --- STAGE 1: AI Analysis ---
                let aiSummary = item.summary;
                let aiTags = Array.isArray(item.tags) ? item.tags : [];
                let aiMetadata = {};

                // Trigger AI if content exists and NO summary provided (or force refresh flag?)
                // Also skip if content is too short (< 5 chars) to save tokens
                if (item.content && item.content.length > 5 && !item.summary) {
                    try {
                        console.log(`[Ingest] Analzying [${item.source}] ${item.title.slice(0, 20)}...`);
                        const analysis = await analyzeNexusItem(item.title, item.content, item.source);

                        if (analysis) {
                            aiSummary = analysis.summary;
                            // Merge tags (Original + AI)
                            aiTags = Array.from(new Set([...aiTags, ...analysis.tags]));
                            aiMetadata = {
                                aiRating: analysis.relevanceScore,
                                aiSentiment: analysis.sentiment,
                                aiProcessedAt: new Date().toISOString()
                            };
                            results.aiProcessed++;
                        }
                    } catch (aiErr) {
                        console.warn(`[Ingest] AI Analysis failed for ${externalId}`, aiErr);
                    }
                }

                // --- STAGE 2: DB Persistence ---
                const mergedMetadata = {
                    ...(item.metadata || {}),
                    ...aiMetadata
                };

                await prisma.nexusItem.upsert({
                    where: {
                        source_externalId: {
                            source: item.source,
                            externalId: externalId
                        }
                    },
                    update: {
                        title: item.title,
                        content: item.content,
                        summary: aiSummary, // Update with AI summary
                        link: item.link,
                        metadata: mergedMetadata, // Merge AI scores
                        tags: aiTags,
                    },
                    create: {
                        source: item.source,
                        sourceType: item.sourceType, // frontier, culture, wool
                        title: item.title,
                        content: item.content,
                        summary: aiSummary,
                        link: item.link,
                        externalId: externalId,
                        authorName: item.authorName,
                        authorAvatar: item.authorAvatar,
                        publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
                        metadata: mergedMetadata,
                        tags: aiTags
                    }
                });
                results.success++;
            } catch (err: any) {
                console.error(`[Ingest] Error processing item:`, err);
                results.failed++;
                results.errors.push(err.message);
            }
        });

        await Promise.all(promises);

        return NextResponse.json({
            success: true,
            stats: results
        });

    } catch (error: any) {
        console.error('[Ingest] Fatal error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
