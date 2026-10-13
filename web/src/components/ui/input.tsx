import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "focus-ring h-10 w-full min-w-0 rounded-control border border-field bg-paper px-4 text-[15px] text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:border-line disabled:bg-panel aria-invalid:border-danger",
        "file:mr-3 file:h-8 file:cursor-pointer file:rounded-control file:border-0 file:bg-wash file:px-4 file:text-[13px] file:font-semibold file:text-wash-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
