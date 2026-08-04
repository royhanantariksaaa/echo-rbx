import { cn } from "@site/src/lib/utils"

export type StreamlineIconName = "book" | "check" | "code" | "identity" | "play"

export function StreamlineIcon({
  name,
  className,
}: {
  name: StreamlineIconName
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("streamline-icon", `streamline-icon--${name}`, className)}
    />
  )
}
