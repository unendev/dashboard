-- CreateTable
CREATE TABLE "post_tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_tags_userId_source_postId_key" ON "post_tags"("userId", "source", "postId");

-- CreateIndex
CREATE INDEX "post_tags_userId_source_idx" ON "post_tags"("userId", "source");

-- CreateIndex
CREATE INDEX "post_tags_userId_tags_idx" ON "post_tags"("userId", "tags");


