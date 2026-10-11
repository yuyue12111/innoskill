import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { SkillFileModel, SkillModel, SkillVersionModel } from "../../generated/prisma/models.js";
import type {
  ManifestEntry,
  Skill,
  SkillFile,
  SkillStatus,
  SkillVersion,
  VersionStatus,
  Visibility,
} from "../../domain/model.js";
import type { Database, Repositories, VersionData } from "../../ports/repositories.js";

type Client = PrismaClient | Prisma.TransactionClient;

// 上传事务里包含写对象存储,默认 5s 不够
const TRANSACTION_TIMEOUT_MS = 30_000;

export function createPgDatabase(prisma: PrismaClient): Database {
  return {
    ...createRepositories(prisma),
    transaction: (fn) =>
      prisma.$transaction((tx) => fn(createRepositories(tx)), { timeout: TRANSACTION_TIMEOUT_MS }),
  };
}

function createRepositories(db: Client): Repositories {
  return {
    skills: {
      findByUserAndSlug: async (userId, slug) =>
        nullable(await db.skill.findUnique({ where: { userId_slug: { userId, slug } } }), toSkill),
      findByIds: async (ids) =>
        (await db.skill.findMany({ where: { id: { in: ids.map(BigInt) } } })).map(toSkill),
      create: async (input) => toSkill(await db.skill.create({ data: input })),
      update: async (id, patch) =>
        toSkill(
          await db.skill.update({
            where: { id: BigInt(id) },
            data: { ...patch, latestVersionId: toBigIntPatch(patch.latestVersionId) },
          }),
        ),
      incrementDownloadCount: async (id) => {
        await db.skill.update({ where: { id: BigInt(id) }, data: { downloadCount: { increment: 1 } } });
      },
    },

    versions: {
      findBySkillAndVersion: async (skillId, version) =>
        nullable(
          await db.skillVersion.findUnique({ where: { skillId_version: { skillId: BigInt(skillId), version } } }),
          toVersion,
        ),
      findByIds: async (ids) =>
        (await db.skillVersion.findMany({ where: { id: { in: ids.map(BigInt) } } })).map(toVersion),
      listBySkill: async (skillId) =>
        (
          await db.skillVersion.findMany({
            where: { skillId: BigInt(skillId) },
            orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
          })
        ).map(toVersion),
      findLatestDownloadable: async (skillId) =>
        nullable(
          await db.skillVersion.findFirst({
            where: { skillId: BigInt(skillId), status: "PUBLISHED", downloadReady: true, yankedAt: null },
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
          }),
          toVersion,
        ),
      create: async ({ skillId, version, ...data }) =>
        toVersion(
          await db.skillVersion.create({ data: { skillId: BigInt(skillId), version, ...toVersionData(data) } }),
        ),
      update: async (id, patch) =>
        toVersion(await db.skillVersion.update({ where: { id: BigInt(id) }, data: toVersionData(patch) })),
    },

    files: {
      listByVersion: async (versionId) =>
        (await db.skillFile.findMany({ where: { versionId: BigInt(versionId) }, orderBy: { id: "asc" } })).map(
          toFile,
        ),
      createMany: async (files) => {
        await db.skillFile.createMany({
          data: files.map((f) => ({ ...f, versionId: BigInt(f.versionId), fileSize: BigInt(f.fileSize) })),
        });
      },
      deleteByVersion: async (versionId) => {
        await db.skillFile.deleteMany({ where: { versionId: BigInt(versionId) } });
      },
    },

    stats: {
      increment: async (skillId, versionId) => {
        await db.skillVersionStats.upsert({
          where: { skillVersionId: BigInt(versionId) },
          create: { skillVersionId: BigInt(versionId), skillId: BigInt(skillId), downloadCount: 1 },
          update: { downloadCount: { increment: 1 }, updatedAt: new Date() },
        });
      },
    },
  };
}

// ---- 行 ↔ 领域对象 ----

const nullable = <R, T>(row: R | null, map: (row: R) => T): T | null => (row === null ? null : map(row));

const toNumberOrNull = (v: bigint | null): number | null => (v === null ? null : Number(v));

function toBigIntPatch(v: number | null | undefined): bigint | null | undefined {
  return v === undefined || v === null ? v : BigInt(v);
}

function toSkill(r: SkillModel): Skill {
  return {
    id: Number(r.id),
    userId: r.userId,
    slug: r.slug,
    skillName: r.skillName,
    summary: r.summary,
    visibility: r.visibility as Visibility,
    status: r.status as SkillStatus,
    latestVersionId: toNumberOrNull(r.latestVersionId),
    downloadCount: Number(r.downloadCount),
    hidden: r.hidden,
    tags: r.tags,
  };
}

function toVersion(r: SkillVersionModel): SkillVersion {
  return {
    id: Number(r.id),
    skillId: Number(r.skillId),
    version: r.version,
    status: r.status as VersionStatus,
    requestedVisibility: r.requestedVisibility as Visibility | null,
    parsedMetadata: r.parsedMetadataJson as Record<string, unknown> | null,
    manifest: r.manifestJson as ManifestEntry[] | null,
    fileCount: r.fileCount,
    totalSize: Number(r.totalSize),
    bundleReady: r.bundleReady,
    downloadReady: r.downloadReady,
    publishedAt: r.publishedAt,
    yankedAt: r.yankedAt,
  };
}

function toVersionData(d: Partial<VersionData>) {
  const json = (v: unknown) =>
    v === undefined ? undefined : v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue);
  return {
    status: d.status,
    requestedVisibility: d.requestedVisibility,
    parsedMetadataJson: json(d.parsedMetadata),
    manifestJson: json(d.manifest),
    fileCount: d.fileCount,
    totalSize: d.totalSize === undefined ? undefined : BigInt(d.totalSize),
    bundleReady: d.bundleReady,
    downloadReady: d.downloadReady,
    publishedAt: d.publishedAt,
    yankedAt: d.yankedAt,
  };
}

function toFile(r: SkillFileModel): SkillFile {
  return {
    id: Number(r.id),
    versionId: Number(r.versionId),
    filePath: r.filePath,
    fileSize: Number(r.fileSize),
    contentType: r.contentType,
    sha256: r.sha256,
    storageKey: r.storageKey,
  };
}
