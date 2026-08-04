import type { ReactNode } from "react"

import { TooltipProvider } from "@site/src/components/ui/tooltip"

export default function Root({ children }: { children: ReactNode }) {
  return <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
}
