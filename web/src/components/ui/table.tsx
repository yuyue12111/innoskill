import * as React from "react"
import { cn } from "@/lib/utils"

// 设计系统 VersionTable：2px 墨线外框、panel 表头、行间 1px 细线；窄屏在自己的容器里横向滚动
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full border-2 border-ink bg-paper text-[13px] leading-5 tabular-nums", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("bg-panel", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn("[tbody_&]:border-t [tbody_&]:border-line", className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("eyebrow h-9 px-4 text-left align-middle whitespace-nowrap", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("px-4 py-3 align-middle whitespace-nowrap", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
