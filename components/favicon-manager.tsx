"use client"

import { useEffect } from "react"

const VARIANTS = ["classic", "neon", "minimal", "orbit"] as const
type FaviconVariant = (typeof VARIANTS)[number]

function isVariant(value: string | null): value is FaviconVariant {
  return value !== null && (VARIANTS as readonly string[]).includes(value)
}

function upsertFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.appendChild(link)
  }
  link.type = "image/svg+xml"
  link.href = href
}

function pickVariant(): FaviconVariant {
  const stored = window.localStorage.getItem("mk-favicon-variant")
  if (isVariant(stored)) return stored
  return "orbit"
}

export function FaviconManager() {
  useEffect(() => {
    const apply = () => {
      const variant = pickVariant()
      upsertFavicon(`/favicons/${variant}.svg`)
    }

    apply()
    const interval = window.setInterval(apply, 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  return null
}
