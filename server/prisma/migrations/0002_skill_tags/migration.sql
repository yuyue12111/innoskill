-- AlterTable
-- NOT NULL 手工补:Prisma 的列表字段表达不了非空(04 §1 约束口径)
ALTER TABLE "skill" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "skill_tags_idx" ON "skill" USING GIN ("tags");

