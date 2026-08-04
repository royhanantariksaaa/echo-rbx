import Link from "@docusaurus/Link"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { ArrowRight } from "lucide-react"

import { StreamlineIcon, type StreamlineIconName } from "@site/src/components/docs/streamline-icon"
import { Badge } from "@site/src/components/ui/badge"
import { Button } from "@site/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@site/src/components/ui/card"
import { Separator } from "@site/src/components/ui/separator"

type Route = {
  number: string
  label: string
  title: string
  description: string
  href: string
}

type Project = {
  eyebrow: string
  title: string
  description: string
  href: string
  action: string
}

type ModelStep = {
  eyebrow: string
  title: string
  description: string
}

type Thread = {
  icon: StreamlineIconName
  title: string
  description: string
  href: string
  action: string
}

export function LibraryHome({
  name,
  strapline,
  introduction,
  demoMotion,
  demoStill,
  demoDescription,
  routes,
  routeTitle,
  routeDescription,
  project,
  modelTitle,
  modelDescription,
  modelSteps,
  threads,
}: {
  name: string
  strapline: string
  introduction: string
  demoMotion: string
  demoStill: string
  demoDescription: string
  routes: Route[]
  routeTitle: string
  routeDescription: string
  project: Project
  modelTitle: string
  modelDescription: string
  modelSteps: ModelStep[]
  threads: Thread[]
}) {
  const motionUrl = useBaseUrl(demoMotion)
  const stillUrl = useBaseUrl(demoStill)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:pt-12">
      <header className="max-w-3xl">
        <Badge variant="outline" className="mb-4 gap-1.5 rounded-md font-mono text-[0.7rem] uppercase">
          <StreamlineIcon name="identity" className="size-3.5" />
          Living handbook
        </Badge>
        <h1 className="mb-3 text-4xl font-bold leading-tight tracking-normal text-foreground sm:text-5xl">{name}</h1>
        <p className="mb-3 text-xl font-medium leading-8 text-foreground">{strapline}</p>
        <p className="mb-0 max-w-2xl text-base leading-7 text-muted-foreground">{introduction}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/docs/intro">
              <StreamlineIcon name="book" className="size-4" />
              Start learning
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/docs/playground">
              <StreamlineIcon name="play" className="size-4" />
              Open playground
            </Link>
          </Button>
        </div>
      </header>

      <Card className="my-10 gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="grid gap-2 border-b bg-muted/35 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <StreamlineIcon name="play" className="size-4 text-primary" />
              Recorded in Roblox Studio
            </CardTitle>
            <CardDescription className="mt-1 text-xs">{demoDescription}</CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit rounded-md">Runtime proof</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <img className="tutorial-demo__motion block aspect-[16/6] w-full object-cover" src={motionUrl} alt={`${name} tutorial running in Roblox Studio`} />
          <img className="tutorial-demo__still block aspect-[16/6] w-full object-cover" src={stillUrl} alt={`${name} tutorial result in Roblox Studio`} />
        </CardContent>
      </Card>

      <section className="grid gap-5 border-y py-7 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="max-w-3xl">
          <p className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase text-primary">
            <StreamlineIcon name="code" className="size-4" />
            {project.eyebrow}
          </p>
          <h2 className="mb-2 text-2xl font-semibold tracking-normal text-foreground">{project.title}</h2>
          <p className="mb-0 text-sm leading-6 text-muted-foreground">{project.description}</p>
        </div>
        <Button asChild variant="outline">
          <Link to={project.href}>
            {project.action}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <section aria-labelledby="guided-route-title" className="py-12">
        <div className="mb-5 max-w-2xl">
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Guided route</p>
          <h2 id="guided-route-title" className="mb-2 text-2xl font-semibold tracking-normal text-foreground">{routeTitle}</h2>
          <p className="mb-0 text-sm leading-6 text-muted-foreground">{routeDescription}</p>
        </div>
        <div className="divide-y rounded-lg border">
          {routes.map((route) => (
            <Link key={route.href} className="group grid gap-3 p-4 no-underline hover:bg-accent/45 hover:no-underline sm:grid-cols-[3rem_1fr_auto] sm:items-center" to={route.href}>
              <span className="font-mono text-xs font-semibold text-primary">{route.number}</span>
              <span>
                <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{route.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{route.description}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary">
                {route.label}
                <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Separator />

      <section className="py-12">
        <div className="mb-6 max-w-2xl">
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Mental model</p>
          <h2 className="mb-2 text-2xl font-semibold tracking-normal text-foreground">{modelTitle}</h2>
          <p className="mb-0 text-sm leading-6 text-muted-foreground">{modelDescription}</p>
        </div>
        <div className="grid overflow-hidden rounded-lg border md:grid-cols-3 md:divide-x">
          {modelSteps.map((step, index) => (
            <div className="border-b p-5 last:border-b-0 md:border-b-0" key={step.title}>
              <span className="font-mono text-[0.7rem] font-semibold uppercase text-primary">{String(index + 1).padStart(2, "0")} / {step.eyebrow}</span>
              <h3 className="mb-2 mt-3 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mb-0 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="py-12">
        <div className="mb-5 max-w-2xl">
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Choose a thread</p>
          <h2 className="mb-2 text-2xl font-semibold tracking-normal text-foreground">Go deeper by the problem you are solving</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {threads.map((thread) => (
            <Card className="shadow-none" key={thread.href}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StreamlineIcon name={thread.icon} className="size-4 text-primary" />
                  {thread.title}
                </CardTitle>
                <CardDescription>{thread.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="link" className="h-auto p-0">
                  <Link to={thread.href}>{thread.action} <ArrowRight /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
