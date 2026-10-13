import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />
}

// 圆形单选：选中时品牌色实心，留一圈 paper 内边
function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "focus-ring relative size-[18px] shrink-0 rounded-full border border-field bg-paper after:absolute after:-inset-2 disabled:cursor-not-allowed disabled:border-line data-[state=checked]:border-signal data-[state=checked]:bg-signal data-[state=checked]:shadow-[inset_0_0_0_3px_var(--paper)]",
        className
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem }
