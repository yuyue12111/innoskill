/** 前端用的 API 类型,与 lib/server/catalog.ts 输出一致 */
export interface SkillSummary {
	num: string; featured: boolean; id: string; name: string; description: string; category: string; tagline: string;
	group: string; type: string; verified: boolean; refText: string; refUrl: string;
	demo: string; hasDemo: boolean; scenario: string; also: string[]; example: string;
}
export interface FileEntry { path: string; size: number }
export interface SkillDetail extends SkillSummary {
	frontmatter: Record<string, string>; files: FileEntry[]; body: string;
	contentHash: string; syncedAt: string; bundleUrl: string;
}
export interface PresetSummary { id: string; name: string; description: string; icon: string }
export interface PresetDetail extends PresetSummary {
	meta: Record<string, unknown>; files: FileEntry[]; contentHash: string; syncedAt: string; bundleUrl: string;
}
export interface ScenarioDef { key: string; title: string; blurb: string; color: { bg: string; fg: string; ink: string }; count: number }
export interface Meta {
	name: string; repo: string; count: { skills: number; presets: number; featured: number };
	categories: Array<{ name: string; count: number }>; scenarios: ScenarioDef[];
	lastSync: { at: string; sha: string; ref: string; skills: number; presets: number } | null; syncing: boolean;
}
export interface MapSkill extends SkillSummary {
	svg: string; w: number; h: number; pattern: string; x: number; y: number;
	fx: number; fy: number; dur: number; delay: number; rot: number;
}
export interface MapScenario extends ScenarioDef { x: number; y: number }
export interface MapData { generated: string | null; total: number; featuredOnly: boolean; repo: string; world: { w: number; h: number }; scenarios: MapScenario[]; skills: MapSkill[] }
export interface Page<T> { items: T[]; total: number; page: number; size: number }
export interface TextFile { path: string; size: number; mime: string; content: string }

/** 卡片封面配色:按分类 */
export const PALETTE: Record<string, { bg: string; fg: string }> = {
	教学辅导: { bg: "#cdd9ce", fg: "#3f5c48" },
	内容创作: { bg: "#e8d6ca", fg: "#9a5c40" },
	文档处理: { bg: "#cddae3", fg: "#3d627e" },
	研究检索: { bg: "#e6e0cd", fg: "#736846" },
	开发工具: { bg: "#d7d0de", fg: "#5b4b73" },
};
export const DEFAULT_COLOR = { bg: "#dcdcdc", fg: "#555555" };
export const colorOf = (category: string) => PALETTE[category] ?? DEFAULT_COLOR;
export const skillSourceUrl = (repo: string, id: string) => `${repo}/tree/main/skill-library/${id}`;
export const presetSourceUrl = (repo: string, id: string) => `${repo}/tree/main/workspace-templates/${id}`;
