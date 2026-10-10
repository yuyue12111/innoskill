import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { SearchIndex, SearchQuery } from "../../ports/searchIndex.js";
import { segmentForIndex, segmentForQuery } from "./segment.js";

export function createPgSearchIndex(prisma: PrismaClient): SearchIndex {
  return {
    async upsert(skillId) {
      const skill = await prisma.skill.findUnique({ where: { id: BigInt(skillId) } });
      if (!skill) return;
      const title = skill.skillName ?? skill.slug;
      const keywords = skill.slug;
      const searchText = segmentForIndex([title, skill.summary ?? "", keywords].join(" "));
      await prisma.$executeRaw`
        INSERT INTO skill_search_document
          (skill_id, user_id, title, summary, keywords, search_text, visibility, status, search_vector)
        VALUES (
          ${skill.id}, ${skill.userId}, ${title}, ${skill.summary}, ${keywords}, ${searchText},
          ${skill.visibility}, ${skill.status},
          setweight(to_tsvector('simple', ${segmentForIndex(title)}), 'A') ||
          setweight(to_tsvector('simple', ${searchText}), 'B')
        )
        ON CONFLICT (skill_id) DO UPDATE SET
          user_id = EXCLUDED.user_id, title = EXCLUDED.title, summary = EXCLUDED.summary,
          keywords = EXCLUDED.keywords, search_text = EXCLUDED.search_text,
          visibility = EXCLUDED.visibility, status = EXCLUDED.status, search_vector = EXCLUDED.search_vector`;
    },

    async search(query) {
      const tsquery = query.q ? segmentForQuery(query.q) : "";
      const where = Prisma.join(conditions(query, tsquery), " AND ");
      // JOIN skill:下架过滤靠它(04 §4.4);可见性也取 skill 表的实时值,索引滞后时不会把已改 PRIVATE 的技能搜出来
      const from = Prisma.sql`
        FROM skill_search_document d
        JOIN skill s ON s.id = d.skill_id
        LEFT JOIN skill_version v ON v.id = s.latest_version_id`;

      const rows = await prisma.$queryRaw<{ skill_id: bigint }[]>`
        SELECT d.skill_id ${from} WHERE ${where}
        ORDER BY ${orderBy(query, tsquery)}
        LIMIT ${query.size} OFFSET ${query.page * query.size}`;
      const [count] = await prisma.$queryRaw<{ total: bigint }[]>`SELECT count(*) AS total ${from} WHERE ${where}`;

      return { ids: rows.map((r) => Number(r.skill_id)), total: Number(count?.total ?? 0) };
    },
  };
}

function conditions(query: SearchQuery, tsquery: string): Prisma.Sql[] {
  const list = [
    Prisma.sql`s.hidden = false`,
    Prisma.sql`s.status = 'ACTIVE'`,
    query.viewerId === null
      ? Prisma.sql`s.visibility = 'PUBLIC'`
      : Prisma.sql`(s.visibility = 'PUBLIC' OR s.user_id = ${query.viewerId})`,
  ];
  if (query.authorId !== null) list.push(Prisma.sql`s.user_id = ${query.authorId}`);
  if (tsquery) list.push(Prisma.sql`d.search_vector @@ plainto_tsquery('simple', ${tsquery})`);
  return list;
}

function orderBy(query: SearchQuery, tsquery: string): Prisma.Sql {
  if (query.sort === "downloads") return Prisma.sql`s.download_count DESC, s.id DESC`;
  if (query.sort === "relevance" && tsquery) {
    return Prisma.sql`ts_rank(d.search_vector, plainto_tsquery('simple', ${tsquery})) DESC, s.id DESC`;
  }
  // newest;没有关键词时 relevance 也按它排
  return Prisma.sql`v.published_at DESC NULLS LAST, s.id DESC`;
}
