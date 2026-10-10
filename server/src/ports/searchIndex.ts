export type SearchSort = "newest" | "downloads" | "relevance";

export interface SearchQuery {
  q: string | null;
  authorId: string | null;
  viewerId: string | null;
  sort: SearchSort;
  page: number;
  size: number;
}

export interface SearchIndex {
  /** 按 skill 当前数据重建索引行(发布提交后异步调用) */
  upsert(skillId: number): Promise<void>;
  /** 阶段 ①:只决定哪些 id 命中、按什么顺序(03 §4.1) */
  search(query: SearchQuery): Promise<{ ids: number[]; total: number }>;
}
