"use client";
import { DynamicIcon, dynamicIconImports, type IconName } from "lucide-react/dynamic";

/** preset.json 里的 icon 是 lucide 图标名(如 "sigma");不认识的名字退回 boxes */
export function PresetIcon({ name, className }: { name: string; className?: string }) {
	const n = (name in dynamicIconImports ? name : "boxes") as IconName;
	return <DynamicIcon name={n} className={className} />;
}
