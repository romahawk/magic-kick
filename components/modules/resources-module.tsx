"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BookOpen, ExternalLink, Search, Plus, Tag, Trash2, Pencil } from "lucide-react"

export function ResourcesModule() {
  const allResources = useAppStore((s) => s.resources)
  const addResource = useAppStore((s) => s.addResource)
  const updateResource = useAppStore((s) => s.updateResource)
  const deleteResource = useAppStore((s) => s.deleteResource)
  const resources = allResources.filter((r) => !r.deleted)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterTag, setFilterTag] = useState<string>("all")
  const [open, setOpen] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinks, setNewLinks] = useState<Array<{ label: string; url: string }>>([])
  const [newCategory, setNewCategory] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newTags, setNewTags] = useState("")
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editLinkLabel, setEditLinkLabel] = useState("")
  const [editLinkUrl, setEditLinkUrl] = useState("")
  const [editLinks, setEditLinks] = useState<Array<{ label: string; url: string }>>([])

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
    const label = newLinkLabel.trim() || "Link"
    setNewLinks((prev) => [...prev, { label, url }])
    setNewLinkLabel("")
    setNewLinkUrl("")
  }

  function getResourceLinks(resource: { url?: string; links?: Array<{ label: string; url: string }> }) {
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
    })
    setNewTitle("")
    setNewLinkLabel("")
    setNewLinkUrl("")
    setNewLinks([])
    setNewCategory("")
    setNewDescription("")
    setNewTags("")
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
  }

  function addEditLink() {
    const url = normalizeUrl(editLinkUrl)
    if (!url) return
    const label = editLinkLabel.trim() || "Link"
    setEditLinks((prev) => [...prev, { label, url }])
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
      tags: editTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      url: normalizedLinks[0]?.url,
      links: normalizedLinks.length > 0 ? normalizedLinks : undefined,
    })
    setEditingResourceId(null)
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="res-title">Title</Label>
                <Input id="res-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Resource name" />
              </div>
              <div>
                <Label>Links (optional)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label (e.g. Trello)"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <Button type="button" variant="secondary" onClick={addStagedLink}>
                    Add
                  </Button>
                </div>
                {newLinks.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {newLinks.map((link, index) => (
                      <div key={`${link.url}-${index}`} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                        <span className="truncate">
                          {link.label}: {link.url}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setNewLinks((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Remove ${link.label} link`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="res-cat">Category</Label>
                <Input id="res-cat" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="CS, Sport, Tools..." />
              </div>
              <div>
                <Label htmlFor="res-desc">Description</Label>
                <Input id="res-desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short description" />
              </div>
              <div>
                <Label htmlFor="res-tags">Tags (comma-separated)</Label>
                <Input id="res-tags" value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="web-dev, free, algorithms" />
              </div>
              <Button onClick={handleAdd}>Add Resource</Button>
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
              {items.map((resource) => (
                <Card key={resource.id} className="transition-colors hover:bg-secondary/30">
                  <CardContent className="p-4">
                    {(() => {
                      const links = getResourceLinks(resource)
                      return (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{resource.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{resource.description}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(resource.id)}
                                aria-label={`Edit ${resource.title}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteResource(resource.id)}
                                aria-label={`Delete ${resource.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
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
                          <div className="mt-2 flex flex-wrap gap-1">
                            {resource.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
      <Dialog open={Boolean(editingResourceId)} onOpenChange={(open) => !open && setEditingResourceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="edit-res-title">Title</Label>
              <Input id="edit-res-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Links (optional)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={editLinkLabel}
                  onChange={(e) => setEditLinkLabel(e.target.value)}
                  placeholder="Label (e.g. Trello)"
                />
                <Input
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Button type="button" variant="secondary" onClick={addEditLink}>
                  Add
                </Button>
              </div>
              {editLinks.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {editLinks.map((link, index) => (
                    <div key={`${link.url}-${index}`} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                      <span className="truncate">
                        {link.label}: {link.url}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setEditLinks((prev) => prev.filter((_, i) => i !== index))}
                        aria-label={`Remove ${link.label} link`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edit-res-cat">Category</Label>
              <Input id="edit-res-cat" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-res-desc">Description</Label>
              <Input id="edit-res-desc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-res-tags">Tags (comma-separated)</Label>
              <Input id="edit-res-tags" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
            </div>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
