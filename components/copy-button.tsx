"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({ text, className, label = "复制" }: { text: string; className?: string; label?: string }) {
	const [done, setDone] = useState(false);
	const copy = async () => {
		try { await navigator.clipboard.writeText(text); }
		catch {
			const ta = document.createElement("textarea");
			ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
			document.body.appendChild(ta); ta.select();
			try { document.execCommand("copy"); } catch { /* ignore */ }
			ta.remove();
		}
		setDone(true); setTimeout(() => setDone(false), 1900);
	};
	return (
		<button type="button" onClick={copy}
			className={cn("rounded-full px-3 py-1 text-[11px] font-bold text-white transition-colors whitespace-nowrap", done ? "bg-primary" : "bg-foreground hover:bg-black", className)}>
			{done ? "已复制 ✓" : label}
		</button>
	);
}
