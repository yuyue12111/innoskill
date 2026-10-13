import * as React from "react"
import { CheckCircleIcon } from "@/components/icons/doodle"
import { cn } from "@/lib/utils"

/** 温柔版 Chip：胶囊形、1px 浅线；选中换品牌色淡底、加粗、前面加一个勾。选中语义（aria-pressed / aria-checked）由调用方给
 * sm 36px 高给列表页的筛选行，default 40px 给表单 */
function Chip({ selected, size = "default", className, children, ...props }: React.ComponentProps<"button"> & {
  selected: boolean
  size?: "default" | "sm"
}) {
  return (
    <button
      type="button"
      data-slot="chip"
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1 rounded-chip border text-[15px] leading-5 transition-colors duration-120",
        size === "sm" ? "h-9 min-w-14 px-4" : "h-10 min-w-16 px-[18px]",
        selected
          ? "border-wash-line bg-wash font-semibold text-wash-ink"
          : "border-line-strong bg-paper text-ink hover:border-field",
        className
      )}
      {...props}
    >
      {selected && <CheckCircleIcon className="size-4" />}
      {children}
    </button>
  )
}

export { Chip }
