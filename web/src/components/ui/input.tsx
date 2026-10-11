import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "focus-ring h-10 w-full min-w-0 border-2 border-ink bg-paper px-3 text-[15px] text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:border-line disabled:bg-panel aria-invalid:border-danger",
        "file:mr-3 file:h-8 file:cursor-pointer file:border-2 file:border-ink file:bg-paper file:px-3 file:text-[13px] file:font-bold file:text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
