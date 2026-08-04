import type { ReactNode } from "react"

import { Badge } from "@site/src/components/ui/badge"
import { StreamlineIcon } from "@site/src/components/docs/streamline-icon"

export function LessonHeader({
  title,
  chapter,
  summary,
  progress,
  children,
}: {
  title: string
  chapter: string
  summary: string
  progress: number
  children?: ReactNode
}) {
  return (
    <header className="lesson-header mb-8 border-b pb-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 rounded-md font-mono text-xs uppercase">
          <StreamlineIcon name="book" className="size-3.5" />
          {chapter}
        </Badge>
        <span className="text-xs text-muted-foreground">{progress}% complete</span>
      </div>
      <h1 className="lesson-header__title mb-3 text-4xl font-bold tracking-normal text-foreground">{title}</h1>
      <p className="lesson-header__summary mb-0 max-w-3xl text-lg leading-8 text-muted-foreground">{summary}</p>
      <div aria-label={`${title} learning progress: ${progress} percent`} className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      {children}
    </header>
  )
}
