"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 渲染 SKILL.md / agent.md 正文;相对路径的图片和链接改指到文件接口 */
export function Markdown({ source, resolveUrl }: { source: string; resolveUrl?: (rel: string) => string }) {
	const transform = (url: string) => {
		if (!resolveUrl) return url;
		if (/^(https?:|mailto:|#|data:)/i.test(url)) return url;
		return resolveUrl(url.replace(/^\.\//, ""));
	};
	return (
		<div className="md">
			<ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={transform}
				components={{
					a: ({ href, children }) => <a href={href} target={href?.startsWith("#") ? undefined : "_blank"} rel="noopener">{children}</a>,
					// eslint-disable-next-line @next/next/no-img-element
					img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />,
				}}>
				{source}
			</ReactMarkdown>
		</div>
	);
}
