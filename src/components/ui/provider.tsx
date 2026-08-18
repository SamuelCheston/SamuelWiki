"use client"

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { useEffect } from "react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

export function Provider(props: ColorModeProviderProps) {
  // #region debug-point C:provider-mounted
  useEffect(() => {
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "homepage-white-screen",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "src/components/ui/provider.tsx",
        msg: "[DEBUG] provider mounted",
        data: {
          hasChildren: Boolean(props.children),
        },
        ts: Date.now(),
      }),
    }).catch(() => {})
  }, [props.children])
  // #endregion

  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
