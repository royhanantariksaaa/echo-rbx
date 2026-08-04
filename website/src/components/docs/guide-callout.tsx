import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@site/src/components/ui/card"
import { StreamlineIcon, type StreamlineIconName } from "@site/src/components/docs/streamline-icon"
import { cn } from "@site/src/lib/utils"

const variants = {
  info: {
    icon: "book" satisfies StreamlineIconName,
    className: "border-l-primary",
  },
  success: {
    icon: "check" satisfies StreamlineIconName,
    className: "border-l-emerald-500",
  },
  warning: {
    icon: "code" satisfies StreamlineIconName,
    className: "border-l-amber-500",
  },
  question: {
    icon: "identity" satisfies StreamlineIconName,
    className: "border-l-secondary",
  },
}

export function GuideCallout({
  title,
  children,
  variant = "info",
}: {
  title: string
  children: ReactNode
  variant?: keyof typeof variants
}) {
  const definition = variants[variant]

  return (
    <Card className={cn("guide-callout my-6 gap-3 border-l-4 py-4 shadow-none", definition.className)}>
      <CardHeader className="grid grid-cols-[auto_1fr] items-center gap-2 px-4">
        <StreamlineIcon name={definition.icon} className="size-4 text-primary" />
        <CardTitle className="text-sm leading-none">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 text-sm leading-6 text-muted-foreground [&_p:last-child]:mb-0">
        {children}
      </CardContent>
    </Card>
  )
}
