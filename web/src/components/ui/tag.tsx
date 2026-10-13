import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 温柔版 Tag：不可点的状态标记，胶囊形淡底、无边框
const tagVariants = cva(
  "inline-flex h-6 shrink-0 items-center rounded-tag px-2.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-wash text-wash-ink",
        muted: "bg-panel text-ink-muted",
        danger: "bg-danger-wash text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Tag({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof tagVariants>) {
  return <span data-slot="tag" className={cn(tagVariants({ variant }), className)} {...props} />
}

export { Tag }
