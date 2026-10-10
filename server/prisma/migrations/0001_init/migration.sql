-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "skill" (
    "id" BIGSERIAL NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "skill_name" VARCHAR(256),
    "summary" VARCHAR(512),
    "visibility" VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "latest_version_id" BIGINT,
    "download_count" BIGINT NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_version" (
    "id" BIGSERIAL NOT NULL,
    "skill_id" BIGINT NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    "requested_visibility" VARCHAR(20),
    "parsed_metadata_json" JSONB,
    "manifest_json" JSONB,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "total_size" BIGINT NOT NULL DEFAULT 0,
    "bundle_ready" BOOLEAN NOT NULL DEFAULT false,
    "download_ready" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ,
    "yanked_at" TIMESTAMPTZ,

    CONSTRAINT "skill_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_file" (
    "id" BIGSERIAL NOT NULL,
    "version_id" BIGINT NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "content_type" VARCHAR(128),
    "sha256" VARCHAR(64) NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,

    CONSTRAINT "skill_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_search_document" (
    "skill_id" BIGINT NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "title" VARCHAR(512),
    "summary" TEXT,
    "keywords" TEXT,
    "search_text" TEXT,
    "visibility" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "skill_search_document_pkey" PRIMARY KEY ("skill_id")
);

-- CreateTable
CREATE TABLE "skill_version_stats" (
    "skill_version_id" BIGINT NOT NULL,
    "skill_id" BIGINT NOT NULL,
    "download_count" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_version_stats_pkey" PRIMARY KEY ("skill_version_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_user_id_slug_key" ON "skill"("user_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_version_skill_id_version_key" ON "skill_version"("skill_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "skill_file_version_id_file_path_key" ON "skill_file"("version_id", "file_path");

-- CreateIndex
CREATE INDEX "skill_search_document_user_id_idx" ON "skill_search_document"("user_id");

-- CreateIndex
CREATE INDEX "skill_search_document_search_vector_idx" ON "skill_search_document" USING GIN ("search_vector");

