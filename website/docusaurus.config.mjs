import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { getBinaryPath } from "moonwave/dist/binary.js"

const require = createRequire(import.meta.url)
const siteDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(siteDir, "..")

function tailwindPlugin() {
  return {
    name: "tailwindcss-postcss",
    configurePostCss(postcssOptions) {
      postcssOptions.plugins.push(require("@tailwindcss/postcss"))
      return postcssOptions
    },
  }
}

export default async function createConfig() {
  const binaryPath = await getBinaryPath()

  return {
    title: "Echo",
    tagline: "Small signals. Predictable lifecycles.",
    favicon: "mark.png",
    url: "https://royhanantariksaaa.github.io",
    baseUrl: "/echo-rbx/",
    organizationName: "royhanantariksaaa",
    projectName: "echo-rbx",
    onBrokenLinks: "warn",
    markdown: {
      hooks: {
        onBrokenMarkdownLinks: "warn",
      },
    },
    staticDirectories: [path.join(projectDir, ".moonwave", "static")],
    themes: [],
    themeConfig: {
      image: "logo.png",
      metadata: [
        { name: "theme-color", content: "#0f766e" },
      ],
      colorMode: {
        defaultMode: "dark",
        respectPrefersColorScheme: true,
      },
      prism: {
        additionalLanguages: [
          "lua",
          "bash",
          "css",
          "javascript",
          "diff",
          "git",
          "json",
          "typescript",
          "toml",
        ],
      },
      navbar: {
        title: "Echo",
        logo: {
          alt: "Echo",
          src: "mark.png",
        },
        items: [
          { type: "doc", docId: "intro", label: "Docs", position: "left" },
          { to: "/api/", label: "API", position: "left" },
          { to: "/docs/playground", label: "Playground", position: "left" },
          { href: "https://royhanantariksaaa.github.io/weave-rbx/", label: "Weave", position: "right" },
          { href: "https://royhanantariksaaa.github.io/weavekit-rbx/", label: "WeaveKit", position: "right" },
          { href: "https://royhanantariksaaa.github.io/flite-rbx/", label: "Flite", position: "right" },
          { href: "https://github.com/royhanantariksaaa/echo-rbx", label: "GitHub", position: "right" },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Libraries",
            items: [
              { label: "Weave", href: "https://royhanantariksaaa.github.io/weave-rbx/" },
              { label: "WeaveKit", href: "https://royhanantariksaaa.github.io/weavekit-rbx/" },
              { label: "Flite", href: "https://royhanantariksaaa.github.io/flite-rbx/" },
            ],
          },
          {
            title: "Credits",
            items: [
              { label: "Streamline Core icons (CC BY 4.0)", href: "https://streamlinehq.com" },
            ],
          },
        ],
        copyright: "Echo documentation. Built with shadcn/ui, Moonwave, and Docusaurus.",
      },
    },
    plugins: [
      tailwindPlugin,
      [
        "docusaurus-plugin-moonwave",
        {
          id: "moonwave",
          code: [path.join(projectDir, "docs-api")],
          sourceUrl: "https://github.com/royhanantariksaaa/echo-rbx/blob/main",
          projectDir,
          classOrder: ["Echo", "Signal", "Connection"],
          apiCategories: [],
          binaryPath,
        },
      ],
      "docusaurus-lunr-search",
    ],
    presets: [
      [
        "@docusaurus/preset-classic",
        {
          docs: {
            path: path.join(projectDir, "docs"),
            editUrl: "https://github.com/royhanantariksaaa/echo-rbx/edit/main/",
            sidebarCollapsible: true,
            sidebarPath: path.join(projectDir, ".moonwave", "sidebars.js"),
          },
          blog: false,
          pages: {
            path: path.join(projectDir, "pages"),
            exclude: ["_*.*"],
          },
          theme: {
            customCss: [
              path.join(projectDir, ".moonwave", "custom.css"),
              "./src/css/globals.css",
            ],
          },
        },
      ],
    ],
  }
}
