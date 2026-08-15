import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getPackageName(id: string) {
  const normalized = id.split("node_modules/")[1]

  if (!normalized) {
    return null
  }

  const parts = normalized.split("/")

  if (parts[0].startsWith("@")) {
    return `${parts[0]}/${parts[1]}`
  }

  return parts[0]
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined
          }

          const packageName = getPackageName(id)

          if (!packageName) {
            return "vendor"
          }

          if (["react", "react-dom", "scheduler"].includes(packageName)) {
            return "react-vendor"
          }

          if (
            packageName === "react-router" ||
            packageName === "react-router-dom" ||
            packageName === "@remix-run/router"
          ) {
            return "router-vendor"
          }

          if (
            packageName === "react-markdown" ||
            packageName === "remark-gfm" ||
            packageName.startsWith("remark-") ||
            packageName.startsWith("rehype-") ||
            packageName.startsWith("mdast-") ||
            packageName.startsWith("micromark") ||
            packageName.startsWith("unist-")
          ) {
            return "markdown-vendor"
          }

          if (
            packageName.startsWith("@chakra-ui/") ||
            packageName.startsWith("@emotion/") ||
            packageName.startsWith("@ark-ui/") ||
            packageName.startsWith("@zag-js/") ||
            packageName === "next-themes" ||
            packageName === "react-icons"
          ) {
            return "ui-vendor"
          }

          if (packageName === "highlight.js") {
            return "code-vendor"
          }

          return "vendor"
        },
      },
    },
  },
})
