"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { selectResourceBacklinks } from "@/lib/roadmap"
import { categoryColor, sortCategories, withUsedCategories } from "@/lib/categories"
import { normalizeUrl } from "@/lib/url"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  BookOpen, Check, ChevronDown, ChevronRight, ExternalLink, GripVertical,
  ChevronsUpDown, MoreHorizontal, Search, Plus, Tag, Trash2, Pencil, X,
} from "lucide-react"

// A card colour is stored as a hex accent and drawn as a soft gradient of it into the card colour,
// so text keeps the theme's foreground in light and dark. Older cards stored a dark fill; each of
// those maps to an accent.
const CARD_COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#22c55e", label: "Green" },
  { value: "#84cc16", label: "Lime" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#ec4899", label: "Pink" },
  { value: "#a855f7", label: "Purple" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#94a3b8", label: "Slate" },
]

const LEGACY_FILLS: Record<string, string> = {
  "#15253a": "#3b82f6",
  "#152a1e": "#22c55e",
  "#2a152e": "#a855f7",
  "#2e1515": "#ef4444",
  "#2a2010": "#f59e0b",
  "#102528": "#14b8a6",
  "#1e1e1e": "#94a3b8",
}

const STARTER_TAGS = ["docs", "course", "tool", "template", "video", "article", "free", "paid"]

function cardAccent(value?: string) {
  if (!value) return ""
  return LEGACY_FILLS[value.toLowerCase()] ?? value
}

function cardStyle(value?: string): React.CSSProperties | undefined {
  const accent = cardAccent(value)
  if (!accent) return undefined
  return {
    backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${accent} 18%, var(--card)) 0%, var(--card) 85%)`,
    borderColor: `color-mix(in oklab, ${accent} 40%, var(--border))`,
  }
}

type LinkEntry = { label: string; url: string }

const chipClass = "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors"
const chipOn = "border-primary bg-primary text-primary-foreground"
const chipOff = "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"

function ColorPicker({ value, onChange, categoryColor }: { value: string; onChange: (v: string) => void; categoryColor?: string }) {
  const accent = cardAccent(value)
  const swatch = (selected: boolean) =>
    cn(
      "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
      selected ? "scale-110 border-foreground" : "border-transparent hover:border-muted-foreground"
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        title="No colour"
        aria-label="No colour"
        aria-pressed={!value}
        onClick={() => onChange("")}
        className={cn(swatch(!value), "border-border bg-card")}
        style={{ backgroundImage: "repeating-linear-gradient(45deg,var(--muted-foreground) 0,var(--muted-foreground) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }}
      />
      {CARD_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          aria-label={c.label}
          aria-pressed={accent === c.value}
          onClick={() => onChange(c.value)}
          className={swatch(accent === c.value)}
          style={{ background: c.value }}
        >
          {accent === c.value && <Check className="h-3 w-3 text-white drop-shadow" />}
        </button>
      ))}
      <label
        title="Custom colour"
        className={cn(swatch(Boolean(accent) && !CARD_COLORS.some((c) => c.value === accent)), "cursor-pointer overflow-hidden border-border")}
        style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#ec4899,#ef4444)" }}
      >
        <input
          type="color"
          aria-label="Custom colour"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#3b82f6"}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {categoryColor ? (
        <Button type="button" variant="ghost" size="sm" className="h-6 gap-1.5 px-2 text-xs" onClick={() => onChange(categoryColor)}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor }} /> Match category
        </Button>
      ) : null}
    </div>
  )
}

/** Task categories first (the same list and colours Tasks use), then any category only resources have. */
function CategoryPicker({
  value, onChange, options, colors,
}: { value: string; onChange: (v: string) => void; options: string[]; colors?: Record<string, string> }) {
  const custom = value && !options.includes(value)
  const [adding, setAdding] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={value === name}
          onClick={() => onChange(name)}
          className={cn(chipClass, "inline-flex items-center gap-1.5 py-1", value === name ? chipOn : chipOff)}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(name, colors) }} />
          {name}
        </button>
      ))}
      {custom && !adding ? (
        <button type="button" aria-pressed className={cn(chipClass, chipOn, "py-1")} onClick={() => setAdding(true)}>
          {value}
        </button>
      ) : null}
      {adding ? (
        <Input
          autoFocus
          value={value}
          placeholder="New category"
          className="h-7 w-40 text-xs"
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setAdding(false)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setAdding(false) } }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(chipClass, chipOff, "inline-flex items-center gap-1 border-dashed py-1")}
        >
          <Plus className="h-3 w-3" /> New
        </button>
      )}
    </div>
  )
}

/** Tags as toggle chips from `suggestions`, plus a field to add your own (Enter or comma). */
function TagPicker({ value, onChange, suggestions }: { value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const selected = value.split(",").map((t) => t.trim()).filter(Boolean)
  const [draft, setDraft] = useState("")
  const shown = Array.from(new Set([...suggestions, ...selected]))
  const commit = (list: string[]) => onChange(list.join(", "))
  const toggle = (tag: string) =>
    commit(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])
  const addDraft = () => {
    const tag = draft.trim().replace(/,$/, "").trim()
    if (tag && !selected.includes(tag)) commit([...selected, tag])
    setDraft("")
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {shown.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={selected.includes(tag)}
            onClick={() => toggle(tag)}
            className={cn(chipClass, selected.includes(tag) ? chipOn : chipOff)}
          >
            {tag}
          </button>
        ))}
      </div>
      <Input
        value={draft}
        placeholder="Add a tag, press Enter"
        className="h-8 text-xs"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={addDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addDraft() }
        }}
      />
    </div>
  )
}

export function ResourcesModule() {
  const allResources = useAppStore((s) => s.resources)
  const addResource = useAppStore((s) => s.addResource)
  const reorderResources = useAppStore((s) => s.reorderResources)
  const updateResource = useAppStore((s) => s.updateResource)
  const deleteResource = useAppStore((s) => s.deleteResource)
  const projects = useAppStore((s) => s.projects)
  const profile = useAppStore((s) => s.profile)
  const tasks = useAppStore((s) => s.tasks)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const resources = useMemo(
    () => allResources.filter((r) => !r.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allResources]
  )

  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterTag, setFilterTag] = useState<string>("all")
  const [open, setOpen] = useState(false)
  const [draggedResourceId, setDraggedResourceId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dragLinkIdx, setDragLinkIdx] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState("")
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinks, setNewLinks] = useState<LinkEntry[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newTags, setNewTags] = useState("")
  const [newColor, setNewColor] = useState("")

  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editLinkLabel, setEditLinkLabel] = useState("")
  const [editLinkUrl, setEditLinkUrl] = useState("")
  const [editLinks, setEditLinks] = useState<LinkEntry[]>([])
  const [editColor, setEditColor] = useState("")

  const categories = useMemo(
    () => Array.from(new Set(resources.map((r) => r.category))),
    [resources]
  )

  const categoryOptions = useMemo(
    () => sortCategories(withUsedCategories(profile.taskCategories, [...tasks, ...resources])),
    [profile.taskCategories, tasks, resources]
  )
  const tagSuggestions = useMemo(
    () => Array.from(new Set([...resources.flatMap((r) => r.tags), ...STARTER_TAGS])).sort((a, b) => a.localeCompare(b)),
    [resources]
  )

  const allTags = useMemo(
    () => Array.from(new Set(resources.flatMap((r) => r.tags))),
    [resources]
  )

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory !== "all" && r.category !== filterCategory) return false
      if (filterTag !== "all" && !r.tags.includes(filterTag)) return false
      return true
    })
  }, [resources, search, filterCategory, filterTag])

  const allExpanded = filtered.length > 0 && filtered.every((r) => expandedIds.has(r.id))

  const grouped = useMemo(() => {
    const map: Record<string, typeof resources> = {}
    for (const r of filtered) {
      if (!map[r.category]) map[r.category] = []
      map[r.category].push(r)
    }
    return map
  }, [filtered])

  function addStagedLink() {
    const url = normalizeUrl(newLinkUrl)
    if (!url) return
    setNewLinks((prev) => [...prev, { label: newLinkLabel.trim() || "Link", url }])
    setNewLinkLabel("")
    setNewLinkUrl("")
  }

  function getResourceLinks(resource: { url?: string; links?: LinkEntry[] }) {
    if (resource.links && resource.links.length > 0) return resource.links
    if (resource.url) return [{ label: "Link", url: resource.url }]
    return []
  }

  function handleAdd() {
    if (!newTitle.trim()) return
    const draftUrl = normalizeUrl(newLinkUrl)
    const draftLinks = draftUrl
      ? [...newLinks, { label: newLinkLabel.trim() || "Link", url: draftUrl }]
      : newLinks
    const normalizedLinks = draftLinks
      .map((link) => ({ label: link.label.trim() || "Link", url: normalizeUrl(link.url) }))
      .filter((link) => Boolean(link.url))

    addResource({
      category: newCategory || "General",
      title: newTitle,
      url: normalizedLinks[0]?.url,
      links: normalizedLinks.length > 0 ? normalizedLinks : undefined,
      description: newDescription,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      color: newColor || undefined,
    })
    setNewTitle("")
    setNewLinkLabel("")
    setNewLinkUrl("")
    setNewLinks([])
    setNewCategory("")
    setNewDescription("")
    setNewTags("")
    setNewColor("")
    setOpen(false)
  }

  function openEdit(resourceId: string) {
    const resource = resources.find((item) => item.id === resourceId)
    if (!resource) return
    setEditingResourceId(resource.id)
    setEditTitle(resource.title)
    setEditCategory(resource.category)
    setEditDescription(resource.description)
    setEditTags(resource.tags.join(", "))
    setEditLinks(getResourceLinks(resource))
    setEditLinkLabel("")
    setEditLinkUrl("")
    setEditColor(resource.color || "")
  }

  function addEditLink() {
    const url = normalizeUrl(editLinkUrl)
    if (!url) return
    setEditLinks((prev) => [...prev, { label: editLinkLabel.trim() || "Link", url }])
    setEditLinkLabel("")
    setEditLinkUrl("")
  }

  function handleSaveEdit() {
    if (!editingResourceId || !editTitle.trim()) return
    const draftUrl = normalizeUrl(editLinkUrl)
    const draftLinks = draftUrl
      ? [...editLinks, { label: editLinkLabel.trim() || "Link", url: draftUrl }]
      : editLinks
    const normalizedLinks = draftLinks
      .map((link) => ({ label: link.label.trim() || "Link", url: normalizeUrl(link.url) }))
      .filter((link) => Boolean(link.url))

    updateResource(editingResourceId, {
      title: editTitle.trim(),
      category: editCategory.trim() || "General",
      description: editDescription.trim(),
      tags: editTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      url: normalizedLinks[0]?.url,
      links: normalizedLinks.length > 0 ? normalizedLinks : undefined,
      color: editColor || undefined,
    })
    setEditingResourceId(null)
  }

  function reorderLinks(links: LinkEntry[], fromIdx: number, toIdx: number): LinkEntry[] {
    const next = [...links]
    const [item] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, item)
    return next
  }

  function renderEditableLinks(
    links: LinkEntry[],
    onRemove: (index: number) => void,
    onReorder: (from: number, to: number) => void
  ) {
    if (links.length === 0) return null
    return (
      <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
        {links.map((link, index) => (
          <div
            key={`${link.url}-${index}`}
            draggable
            onDragStart={() => setDragLinkIdx(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragLinkIdx === null || dragLinkIdx === index) return
              onReorder(dragLinkIdx, index)
              setDragLinkIdx(null)
            }}
            onDragEnd={() => setDragLinkIdx(null)}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border/80 bg-secondary/20 px-3 py-2 cursor-grab active:cursor-grabbing",
              dragLinkIdx === index && "opacity-50"
            )}
          >
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5">{link.label}</p>
              <p className="break-all text-xs leading-5 text-muted-foreground">{link.url}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${link.label} link`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            {resources.length} {resources.length === 1 ? "resource" : "resources"} · links open in a new tab
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="border-b px-6 pt-6 pb-4">
              <DialogTitle>Add Resource</DialogTitle>
            </DialogHeader>
            <div className="flex max-h-[calc(85vh-4.5rem)] flex-col gap-4 overflow-y-auto px-6 pb-6">
              <div>
                <Label htmlFor="res-title">Title</Label>
                <Input id="res-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Resource name" className="mt-1" />
              </div>
              <div>
                <Label>Links (optional)</Label>
                <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <Input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label (e.g. Trello)" />
                  <Input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." />
                  <Button type="button" variant="secondary" onClick={addStagedLink}>Add</Button>
                </div>
                {renderEditableLinks(
                  newLinks,
                  (index) => setNewLinks((prev) => prev.filter((_, i) => i !== index)),
                  (from, to) => setNewLinks((prev) => reorderLinks(prev, from, to))
                )}
              </div>
              <div>
                <Label>Category</Label>
                <div className="mt-2"><CategoryPicker value={newCategory} onChange={setNewCategory} options={categoryOptions} colors={profile.taskCategoryColors} /></div>
              </div>
              <div>
                <Label htmlFor="res-desc">Description</Label>
                <Textarea id="res-desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short description" className="mt-1 min-h-24 resize-y" />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="mt-2"><TagPicker value={newTags} onChange={setNewTags} suggestions={tagSuggestions} /></div>
              </div>
              <div>
                <Label>Card color</Label>
                <div className="mt-2"><ColorPicker value={newColor} onChange={setNewColor} categoryColor={newCategory ? categoryColor(newCategory, profile.taskCategoryColors) : undefined} /></div>
              </div>
              <Button onClick={handleAdd} className="w-full">Add Resource</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            aria-label="Search resources"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={filterCategory === cat}
              onClick={() => setFilterCategory(cat === filterCategory ? "all" : cat)}
              className={cn(chipClass, filterCategory === cat ? chipOn : chipOff)}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
          {allTags.length > 0 && (
            <>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              <Tag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={filterTag === tag}
                  onClick={() => setFilterTag(tag === filterTag ? "all" : tag)}
                  className={cn(chipClass, filterTag === tag ? chipOn : chipOff)}
                >
                  {tag}
                </button>
              ))}
            </>
          )}
          {filtered.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setExpandedIds(allExpanded ? new Set() : new Set(filtered.map((r) => r.id)))}
            >
              <ChevronsUpDown className="h-3.5 w-3.5" /> {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          )}
        </div>
      </div>

      {/* Grouped resources */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {resources.length === 0 ? "No resources yet. Add your first link." : "No resources match these filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section key={category} aria-label={category}>
            <h2 className="mb-2 flex items-baseline gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {category}
              <span className="tabular-nums normal-case tracking-normal opacity-70">{items.length}</span>
            </h2>
            <div className="grid gap-2 lg:grid-cols-2">
              {items.map((resource) => {
                const isExpanded = expandedIds.has(resource.id)
                const links = getResourceLinks(resource)
                const backlinks = selectResourceBacklinks(resource.id, projects)
                return (
                  <div
                    key={resource.id}
                    className={cn(
                      "group flex items-start gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-xs transition-[box-shadow,opacity] hover:shadow-md",
                      draggedResourceId === resource.id && "opacity-60"
                    )}
                    style={cardStyle(resource.color)}
                    draggable
                    onDragStart={() => setDraggedResourceId(resource.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (!draggedResourceId || draggedResourceId === resource.id) return
                      reorderResources(draggedResourceId, resource.id)
                      setDraggedResourceId(null)
                    }}
                    onDragEnd={() => setDraggedResourceId(null)}
                  >
                    <GripVertical
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => toggleExpanded(resource.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                          <span className="min-w-0 truncate text-sm font-semibold">{resource.title}</span>
                          {links.length > 0 && (
                            <span className="ml-1 shrink-0 rounded-full bg-background/60 px-1.5 py-px text-[10px] font-medium tabular-nums text-muted-foreground">
                              {links.length} {links.length === 1 ? "link" : "links"}
                            </span>
                          )}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground"
                              aria-label={`Actions for ${resource.title}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openEdit(resource.id)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setPendingDeleteId(resource.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {resource.description && (
                        <p className={cn("mt-0.5 break-words text-xs text-muted-foreground", !isExpanded && "line-clamp-1")}>
                          {resource.description}
                        </p>
                      )}

                      {isExpanded && links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {links.map((link, index) => (
                            <a
                              key={`${resource.id}-${link.url}-${index}`}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/80 bg-background/70 px-2 py-0.5 text-[11px] text-foreground/90 transition-colors hover:border-primary/50 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="truncate">{link.label || "Link"}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            </a>
                          ))}
                        </div>
                      )}

                      {isExpanded && (resource.tags.length > 0 || backlinks.length > 0) && (
                        <div className="mt-2 flex flex-col gap-2">
                          {resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resource.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          )}
                          {backlinks.length > 0 && (
                            <div className="border-t border-border/60 pt-2">
                              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Linked from</p>
                              <div className="flex flex-col gap-0.5">
                                {backlinks.map((link) => (
                                  <button
                                    key={`${link.projectId}-${link.milestoneId ?? "project"}`}
                                    type="button"
                                    onClick={() => setActiveModule("projects")}
                                    className="flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                  >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: link.projectColor }} />
                                    <span className="truncate">{link.projectTitle}</span>
                                    {link.milestoneTitle ? (
                                      <>
                                        <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                                        <span className="truncate">{link.milestoneTitle}</span>
                                      </>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteId && resources.find((r) => r.id === pendingDeleteId)?.title
                ? `"${resources.find((r) => r.id === pendingDeleteId)!.title}" will be permanently removed.`
                : "This resource will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteResource(pendingDeleteId!); setPendingDeleteId(null) }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(editingResourceId)} onOpenChange={(open) => !open && setEditingResourceId(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 pt-6 pb-4">
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[calc(85vh-4.5rem)] flex-col gap-4 overflow-y-auto px-6 pb-6">
            <div>
              <Label htmlFor="edit-res-title">Title</Label>
              <Input id="edit-res-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Links (optional)</Label>
              <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <Input value={editLinkLabel} onChange={(e) => setEditLinkLabel(e.target.value)} placeholder="Label (e.g. Trello)" />
                <Input value={editLinkUrl} onChange={(e) => setEditLinkUrl(e.target.value)} placeholder="https://..." />
                <Button type="button" variant="secondary" onClick={addEditLink}>Add</Button>
              </div>
              {renderEditableLinks(
                editLinks,
                (index) => setEditLinks((prev) => prev.filter((_, i) => i !== index)),
                (from, to) => setEditLinks((prev) => reorderLinks(prev, from, to))
              )}
            </div>
            <div>
              <Label>Category</Label>
              <div className="mt-2"><CategoryPicker value={editCategory} onChange={setEditCategory} options={categoryOptions} colors={profile.taskCategoryColors} /></div>
            </div>
            <div>
              <Label htmlFor="edit-res-desc">Description</Label>
              <Textarea id="edit-res-desc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1 min-h-24 resize-y" />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="mt-2"><TagPicker value={editTags} onChange={setEditTags} suggestions={tagSuggestions} /></div>
            </div>
            <div>
              <Label>Card color</Label>
              <div className="mt-2"><ColorPicker value={editColor} onChange={setEditColor} categoryColor={editCategory ? categoryColor(editCategory, profile.taskCategoryColors) : undefined} /></div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
