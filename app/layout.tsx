import type { Metadata } from "next";
import { GrainDefs } from "@/components/grain-defs";
import "./globals.css";

export const metadata: Metadata = {
	title: { default: "Innoskill · 技能库", template: "%s · Innoskill" },
	description: "面向教学、自学、研究与创作的 Agent 技能平台:挑选、展示、供货。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="zh-CN">
			<body>
				<GrainDefs />
				{children}
			</body>
		</html>
	);
}
