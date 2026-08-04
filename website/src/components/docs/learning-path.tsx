import Link from "@docusaurus/Link"
import { ArrowRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@site/src/components/ui/card"

export type LearningPathItem = {
  eyebrow: string
  title: string
  description: string
  href: string
}

export function LearningPath({ items }: { items: LearningPathItem[] }) {
  return (
    <div className="my-6 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.href} className="group gap-2 py-0 shadow-none transition-colors hover:border-primary/70">
          <Link className="grid min-h-40 content-between p-5 no-underline hover:no-underline" to={item.href}>
            <CardHeader className="gap-2 p-0">
              <span className="font-mono text-[0.7rem] font-semibold uppercase text-primary">{item.eyebrow}</span>
              <CardTitle className="text-base text-foreground group-hover:text-primary">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="mt-5 flex items-end justify-between gap-4 p-0">
              <p className="mb-0 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  )
}
