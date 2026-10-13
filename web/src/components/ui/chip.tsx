import * as React from "react"
import { cn } from "@/lib/utils"

/** 设计系统 Chip：2px 墨线，选中反色，悬停外加一圈墨线。选中语义（aria-pressed / aria-checked）由调用方给
 * default 64×43 给表单；sm 56×36 给列表页的筛选行（改版稿：筛选压成两行，给卡片让出首屏） */
function Chip({ selected, size = "default", className, ...props }: React.ComponentProps<"button"> & {
  selected: boolean
  size?: "default" | "sm"
}) {
  return (
    <button
      type="button"
      data-slot="chip"
      className={cn(
        "focus-ring box-hover type-label inline-flex items-center justify-center border-2 border-ink transition-colors duration-120",
        size === "sm" ? "h-9 min-w-14 px-3.5" : "h-[43px] min-w-16 px-4",
        selected ? "bg-ink text-on-ink" : "bg-paper text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Chip }
