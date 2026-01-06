-- CreateTable reddit_comments
CREATE TABLE "public"."reddit_comments" (
    "comment_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "reddit_post_id" TEXT NOT NULL,
    "author" TEXT,
    "body" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_utc" TIMESTAMPTZ(6) NOT NULL,
    "parent_id" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "is_submitter" BOOLEAN NOT NULL DEFAULT false,
    "permalink" TEXT,
    "scraped_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reddit_comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateIndex
CREATE INDEX "reddit_comments_post_id_idx" ON "public"."reddit_comments"("post_id");

-- CreateIndex
CREATE INDEX "reddit_comments_reddit_post_id_idx" ON "public"."reddit_comments"("reddit_post_id");

-- CreateIndex
CREATE INDEX "reddit_comments_created_utc_idx" ON "public"."reddit_comments"("created_utc");

-- CreateIndex
CREATE UNIQUE INDEX "reddit_comments_comment_id_key" ON "public"."reddit_comments"("comment_id");

-- AddForeignKey
ALTER TABLE "public"."reddit_comments" ADD CONSTRAINT "reddit_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."reddit_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

