import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

// 设计系统 Button：直角、2px 墨线，悬停外加一圈墨线；主按钮每屏最多一个，危险按钮只放在确认弹窗里
const buttonVariants = cva(
  "focus-ring inline-flex shrink-0 items-center justify-center gap-2 border-2 font-bold whitespace-nowrap transition-colors duration-120 ease-out select-none disabled:pointer-events-none disabled:border-line disabled:bg-panel disabled:text-ink-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "box-hover border-ink bg-ink text-on-ink",
        outline: "box-hover border-ink bg-paper text-ink",
        ghost: "border-transparent bg-transparent text-ink-muted hover:text-ink",
        destructive: "border-danger bg-danger text-on-danger hover:outline-2 hover:outline-offset-2 hover:outline-danger",
        link: "border-transparent bg-transparent px-0 text-ink underline underline-offset-4 hover:text-ink-muted",
      },
      size: {
        default: "h-[43px] px-4 text-[15px] tracking-[0.06em]",
        sm: "h-8 px-3 text-[13px] tracking-[0.04em]",
        lg: "h-12 px-5 text-[15px] tracking-[0.06em]",
        icon: "size-[43px]",
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
