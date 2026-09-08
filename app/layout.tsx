import type { Metadata } from "next";
import localFont from "next/font/local";
import { GrainDefs } from "@/components/grain-defs";
import "./globals.css";

// Schoolbell(OFL,见 /Schoolbell/LICENSE.txt):只有 Regular 一个字重,只覆盖拉丁字母与数字;
// 汉字回落到系统中文字体,层级靠字号、字距和颜色拉开,不用假粗体(见 globals.css 的 font-synthesis)。
const schoolbell = localFont({
	src: "../Schoolbell/Schoolbell-Regular.ttf",
	weight: "400",
	style: "normal",
	display: "swap",
	variable: "--font-schoolbell",
});

export const metadata: Metadata = {
	title: { default: "Innoskill · 技能库", template: "%s · Innoskill" },
	description: "面向教学、自学、研究与创作的 Agent 技能平台:挑选、展示、供货。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="zh-CN" className={schoolbell.variable}>
			<body>
				<GrainDefs />
				{children}
			</body>
		</html>
	);
}
