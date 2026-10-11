import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/lib/theme"

// 设计系统：直角、2px 墨线、无阴影
const Toaster = (props: ToasterProps) => {
  const theme = useTheme((s) => s.theme)
  return (
    <Sonner
      theme={theme}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--paper)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--ink)",
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!border-2 !shadow-none !font-sans",
          description: "!text-ink-muted",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
