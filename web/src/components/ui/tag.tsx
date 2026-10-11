import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 设计系统 Tag：不可点的状态标记，1px 细框（2px 留给可操作的东西）
const tagVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center border px-2 text-xs font-bold tracking-[0.06em] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-ink bg-paper text-ink",
        muted: "border-line bg-paper text-ink-muted",
        special: "border-wash-ink bg-wash text-wash-ink",
        danger: "border-danger bg-paper text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Tag({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof tagVariants>) {
  return <span data-slot="tag" className={cn(tagVariants({ variant }), className)} {...props} />
}

export { Tag }
