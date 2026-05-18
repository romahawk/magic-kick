"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  BookOpen, Check, ChevronDown, ChevronRight, ExternalLink, GripVertical,
  Search, Plus, Tag, Trash2, Pencil, X,
} from "lucide-react"

const CARD_COLORS = [
  { value: "", label: "Default" },
  { value: "#15253a", label: "Navy" },
  { value: "#152a1e", label: "Forest" },
  { value: "#2a152e", label: "Plum" },
  { value: "#2e1515", label: "Rust" },
  { value: "#2a2010", label: "Amber" },
  { value: "#102528", label: "Teal" },
  { value: "#1e1e1e", label: "Graphite" },
]

type LinkEntry = { label: string; url: string }

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CARD_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
            value === c.value ? "scale-110 border-primary" : "border-border hover:border-muted-foreground"
          )}
          style={{
            background: c.value || undefined,
            backgroundImage: c.value
              ? undefined
              : "repeating-linear-gradient(45deg,#555 0,#555 2px,transparent 0,transparent 50%)",
            backgroundSize: c.value ? undefined : "8px 8px",
          }}
        >
          {value === c.value && <Check className="h-3 w-3 text-white drop-shadow" />}
        </button>
      ))}
    </div>
  )
}

export function ResourcesModule() {
  const allResources = useAppStore((s) => s.resources)
  const addResource = useAppStore((s) => s.addResource)
  const reorderResources = useAppStore((s) => s.reorderResources)
  const updateResource = useAppStore((s) => s.updateResource)
  const deleteResource = useAppStore((s) => s.deleteResource)
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

  const grouped = useMemo(() => {
    const map: Record<string, typeof resources> = {}
    for (const r of filtered) {
      if (!map[r.category]) map[r.category] = []
      map[r.category].push(r)
    }
    return map
  }, [filtered])

  function normalizeUrl(url: string) {
    const trimmed = url.trim()
    if (!trimmed) return ""
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

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
          <p className="text-sm text-muted-foreground">Your curated collection of links and materials.</p>
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
                <Label htmlFor="res-cat">Category</Label>
                <Input id="res-cat" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="CS, Sport, Tools..." className="mt-1" />
              </div>
              <div>
                <Label htmlFor="res-desc">Description</Label>
                <Textarea id="res-desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short description" className="mt-1 min-h-24 resize-y" />
              </div>
              <div>
                <Label htmlFor="res-tags">Tags (comma-separated)</Label>
                <Input id="res-tags" value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="web-dev, free, algorithms" className="mt-1" />
              </div>
              <div>
                <Label>Card color</Label>
                <div className="mt-2"><ColorPicker value={newColor} onChange={setNewColor} /></div>
              </div>
              <Button onClick={handleAdd} className="w-full">Add Resource</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filterCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat === filterCategory ? "all" : cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filterCategory === cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        {resources.length > 1 ? <p className="text-xs text-muted-foreground">Drag cards to reorder them.</p> : null}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setFilterTag("all")}
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
              filterTag === "all" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            All tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? "all" : tag)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                filterTag === tag ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grouped resources */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No resources found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">{category} ({items.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((resource) => {
                const isExpanded = expandedIds.has(resource.id)
                const links = getResourceLinks(resource)
                return (
                  <Card
                    key={resource.id}
                    className={cn(
                      "transition-colors",
                      "cursor-grab active:cursor-grabbing",
                      draggedResourceId === resource.id && "opacity-60"
                    )}
                    style={resource.color ? { backgroundColor: resource.color } : undefined}
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
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-1 text-left"
                          onClick={() => toggleExpanded(resource.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          }
                          <span className="min-w-0 truncate text-sm font-medium">{resource.title}</span>
                          {!isExpanded && links.length > 0 && (
                            <span className="ml-1 shrink-0 text-xs text-muted-foreground">({links.length})</span>
                          )}
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); openEdit(resource.id) }}
                            aria-label={`Edit ${resource.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteResource(resource.id) }}
                            aria-label={`Delete ${resource.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2">
                          {resource.description && (
                            <p className="text-xs text-muted-foreground">{resource.description}</p>
                          )}
                          {links.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {links.map((link, index) => (
                                <a
                                  key={`${resource.id}-${link.url}-${index}`}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                >
                                  <span>{link.label || "Link"}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          )}
                          {resource.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {resource.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

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
              <Label htmlFor="edit-res-cat">Category</Label>
              <Input id="edit-res-cat" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="edit-res-desc">Description</Label>
              <Textarea id="edit-res-desc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1 min-h-24 resize-y" />
            </div>
            <div>
              <Label htmlFor="edit-res-tags">Tags (comma-separated)</Label>
              <Input id="edit-res-tags" value={editTags} onChange={(e) => setEditTags(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Card color</Label>
              <div className="mt-2"><ColorPicker value={editColor} onChange={setEditColor} /></div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
