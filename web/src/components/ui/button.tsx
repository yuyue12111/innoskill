import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

// 温柔版 Button：胶囊形。主按钮品牌色填充，每屏最多一个；soft 是品牌色淡底，给次一级的正向操作；
// 危险按钮只放在确认弹窗里
const buttonVariants = cva(
  "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors duration-120 ease-out select-none disabled:pointer-events-none disabled:border-transparent disabled:bg-panel disabled:text-ink-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-signal text-on-signal hover:bg-signal-hover",
        soft: "bg-wash text-wash-ink hover:bg-wash-hover",
        outline: "border border-field bg-paper text-ink hover:bg-panel",
        ghost: "bg-transparent text-ink-muted hover:bg-panel hover:text-ink",
        destructive: "bg-danger text-on-danger hover:opacity-90",
        link: "px-0 text-wash-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-[18px] text-[15px]",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
