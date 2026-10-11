import * as React from "react"
import { cn } from "@/lib/utils"

/** 设计系统 Chip：最小 64×43、2px 墨线，选中反色，悬停外加一圈墨线。选中语义（aria-pressed / aria-checked）由调用方给 */
function Chip({ selected, className, ...props }: React.ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      data-slot="chip"
      className={cn(
        "focus-ring box-hover type-label inline-flex h-[43px] min-w-16 items-center justify-center border-2 border-ink px-4 transition-colors duration-120",
        selected ? "bg-ink text-on-ink" : "bg-paper text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Chip }
