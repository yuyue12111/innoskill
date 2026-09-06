"use client";
import useSWR from "swr";
import type { MapData, Meta, PackDetail, PackSummary, Page, PresetDetail, PresetSummary, SkillDetail, SkillSummary, TextFile } from "./types";

class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function fetcher<T>(url: string): Promise<T> {
	const res = await fetch(url);
	const body = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: T } | null;
	if (!res.ok || !body || body.code !== 0) throw new ApiError(res.status, body?.msg ?? `HTTP ${res.status}`);
	return body.data as T;
}

const opts = { revalidateOnFocus: false, dedupingInterval: 30_000 };

export const useMeta = () => useSWR<Meta>("/api/v1/meta", fetcher, opts);
export const useMap = () => useSWR<MapData>("/api/v1/map", fetcher, opts);
export const usePresets = () => useSWR<Page<PresetSummary>>("/api/v1/presets", fetcher, opts);
export const usePreset = (id: string | null) => useSWR<PresetDetail>(id ? `/api/v1/presets/${encodeURIComponent(id)}` : null, fetcher, opts);
export const usePacks = () => useSWR<Page<PackSummary>>("/api/v1/packs", fetcher, opts);
export const usePack = (id: string | null) => useSWR<PackDetail>(id ? `/api/v1/packs/${encodeURIComponent(id)}` : null, fetcher, opts);
export const recordSkillView = (id: string) => { void fetch(`/api/v1/skills/${encodeURIComponent(id)}/view`, { method: "POST" }).catch(() => {}); };
export const useSkill = (id: string | null) => useSWR<SkillDetail>(id ? `/api/v1/skills/${encodeURIComponent(id)}` : null, fetcher, opts);

export function useSkills(params: { q?: string; category?: string; scenario?: string; featured?: boolean; pack?: string; subject?: string; kind?: string }) {
	const sp = new URLSearchParams();
	if (params.q) sp.set("q", params.q);
	if (params.category) sp.set("category", params.category);
	if (params.scenario) sp.set("scenario", params.scenario);
	if (params.featured) sp.set("featured", "1");
	if (params.pack) sp.set("pack", params.pack);
	if (params.subject) sp.set("subject", params.subject);
	if (params.kind) sp.set("kind", params.kind);
	sp.set("size", "200");
	return useSWR<Page<SkillSummary>>(`/api/v1/skills?${sp}`, fetcher, { ...opts, keepPreviousData: true });
}

export function useSkillFile(id: string | null, path: string | null) {
	return useSWR<TextFile>(id && path ? `/api/v1/skills/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}` : null, fetcher, opts);
}
export function usePresetFile(id: string | null, path: string | null) {
	return useSWR<TextFile>(id && path ? `/api/v1/presets/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}` : null, fetcher, opts);
}
export const rawFileUrl = (kind: "skills" | "presets", id: string, path: string) =>
	`/api/v1/${kind}/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}&raw=1`;
