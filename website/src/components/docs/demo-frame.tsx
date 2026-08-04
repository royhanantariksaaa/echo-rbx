import useBaseUrl from "@docusaurus/useBaseUrl"

import { Badge } from "@site/src/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@site/src/components/ui/card"
import { StreamlineIcon } from "@site/src/components/docs/streamline-icon"

export function DemoFrame({
  title,
  description,
  motionSrc,
  stillSrc,
  alt,
}: {
  title: string
  description: string
  motionSrc: string
  stillSrc: string
  alt: string
}) {
  const motionUrl = useBaseUrl(motionSrc)
  const stillUrl = useBaseUrl(stillSrc)

  return (
    <Card className="demo-frame my-8 gap-0 overflow-hidden py-0 shadow-none">
      <CardHeader className="grid gap-2 border-b bg-muted/35 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <StreamlineIcon name="play" className="size-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <Badge variant="outline" className="w-fit rounded-md">Roblox Studio</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <figure className="m-0">
          <img className="tutorial-demo__motion block aspect-video w-full object-cover" src={motionUrl} alt={alt} />
          <img className="tutorial-demo__still block aspect-video w-full object-cover" src={stillUrl} alt={alt} />
        </figure>
      </CardContent>
    </Card>
  )
}
