"use client"

// P23 — Share a project roadmap as an image, a PDF or Markdown (ADR-035).
// Everything is generated in the browser from local data; nothing is uploaded or made public.

import { useEffect, useMemo, useState } from "react"
import {
  CARD_FONT_STACK,
  DEFAULT_SHARE_OPTIONS,
  roadmapToMarkdown,
  roadmapToSvg,
  shareFileName,
  type MeasureText,
  type ShareOptions,
} from "@/lib/roadmap-share"
import type { ProjectRoadmap } from "@/lib/roadmap"
import type { Project, Resource } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Check, ClipboardCopy, FileDown, ImageDown, Loader2, Share2 } from "lucide-react"

const PNG_SCALE = 2

function createMeasure(): MeasureText {
  if (typeof document === "undefined") return (text, font) => text.length * (Number(/(\d+)px/.exec(font)?.[1] ?? 16) * 0.55)
  const ctx = document.createElement("canvas").getContext("2d")
  const cache = new Map<string, number>()
  return (text, font) => {
    const key = `${font}|${text}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    if (!ctx) return text.length * 10
    ctx.font = font
    // +2% guards against small differences between canvas and SVG text shaping.
    const width = ctx.measureText(text).width * 1.02
    cache.set(key, width)
    return width
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const img = new Image()
    img.decoding = "async"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Could not render the roadmap image."))
      img.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = width * PNG_SCALE
    canvas.height = height * PNG_SCALE
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas is not available in this browser.")
    ctx.scale(PNG_SCALE, PNG_SCALE)
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the PNG."))), "image/png")
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Prints the vector card from a hidden iframe, so the PDF keeps selectable text. */
function printSvg(svg: string, width: number, height: number, title: string) {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    throw new Error("Printing is not available in this browser.")
  }
  const safeTitle = title.replace(/[<>&"]/g, "")
  // Page width matches the card; height follows it, so a long roadmap is one tall page in Chrome
  // and splits cleanly elsewhere.
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>
    @page { size: ${width}px ${height}px; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    svg { display: block; width: ${width}px; height: ${height}px; }
  </style></head><body>${svg}</body></html>`)
  doc.close()
  const cleanup = () => setTimeout(() => iframe.remove(), 500)
  win.addEventListener("afterprint", cleanup, { once: true })
  setTimeout(() => {
    win.focus()
    win.print()
    // Safari does not always fire afterprint.
    setTimeout(cleanup, 60_000)
  }, 50)
}

type Busy = null | "png" | "pdf" | "share"

export function RoadmapShareDialog({
  open,
  onOpenChange,
  project,
  roadmap,
  resources,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  roadmap: ProjectRoadmap
  resources: Resource[]
}) {
  const [options, setOptions] = useState<ShareOptions>(DEFAULT_SHARE_OPTIONS)
  const [busy, setBusy] = useState<Busy>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const measure = useMemo(() => createMeasure(), [])
  const today = useMemo(() => new Date(), [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const input = { project, roadmap, resources, today, options }
  const card = useMemo(() => roadmapToSvg(input, measure), [project, roadmap, resources, today, options, measure]) // eslint-disable-line react-hooks/exhaustive-deps
  const previewSrc = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card.svg)}`, [card.svg])

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof File === "undefined" || !navigator.canShare) return
    try {
      setCanNativeShare(navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }))
    } catch {
      setCanNativeShare(false)
    }
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  async function run(kind: Exclude<Busy, null>, fn: () => Promise<void> | void) {
    setError(null)
    setBusy(kind)
    try {
      await fn()
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return // user closed the share sheet
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(null)
    }
  }

  const downloadPng = () =>
    run("png", async () => {
      const blob = await svgToPngBlob(card.svg, card.width, card.height)
      downloadBlob(blob, shareFileName(project, today, "png"))
    })

  const nativeShare = () =>
    run("share", async () => {
      const blob = await svgToPngBlob(card.svg, card.width, card.height)
      const file = new File([blob], shareFileName(project, today, "png"), { type: "image/png" })
      await navigator.share({ files: [file], title: `${project.title} — Roadmap` })
    })

  const savePdf = () =>
    run("pdf", () => printSvg(card.svg, card.width, card.height, shareFileName(project, today, "pdf").replace(/\.pdf$/, "")))

  async function copyMarkdown() {
    setError(null)
    try {
      await navigator.clipboard.writeText(roadmapToMarkdown(input))
      setCopied(true)
    } catch {
      setError("Clipboard access was blocked. Allow it in the browser and try again.")
    }
  }

  const toggles: Array<{ key: keyof ShareOptions; label: string }> = [
    { key: "includeTasks", label: "Tasks" },
    { key: "includeNotes", label: "Definitions of done" },
    { key: "includeResources", label: "Resources" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share roadmap</DialogTitle>
          <DialogDescription>
            A snapshot of “{project.title}” as of today. It is created on this device; nothing is uploaded.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="Include in snapshot">
          {toggles.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Switch
                id={`share-${key}`}
                checked={options[key]}
                onCheckedChange={(checked) => setOptions((o) => ({ ...o, [key]: checked }))}
              />
              <Label htmlFor={`share-${key}`} className="text-sm font-normal">
                {label}
              </Label>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL preview, not a remote image */}
          <img
            src={previewSrc}
            alt={`Roadmap preview for ${project.title}`}
            width={card.width}
            height={card.height}
            className="mx-auto h-auto w-full max-w-[640px] rounded-md shadow-sm ring-1 ring-black/5"
            style={{ fontFamily: CARD_FONT_STACK }}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={copyMarkdown} className="gap-2" aria-live="polite">
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy as Markdown"}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={savePdf} disabled={busy !== null} className="gap-2">
              {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Save as PDF
            </Button>
            {canNativeShare ? (
              <Button type="button" variant="outline" onClick={nativeShare} disabled={busy !== null} className="gap-2">
                {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Share image
              </Button>
            ) : null}
            <Button type="button" onClick={downloadPng} disabled={busy !== null} className="gap-2">
              {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
              Download image
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
