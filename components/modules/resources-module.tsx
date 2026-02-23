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
import { BookOpen, ExternalLink, Search, Plus, Tag } from "lucide-react"

export function ResourcesModule() {
  const allResources = useAppStore((s) => s.resources)
  const addResource = useAppStore((s) => s.addResource)
  const resources = allResources.filter((r) => !r.deleted)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterTag, setFilterTag] = useState<string>("all")
  const [open, setOpen] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newTags, setNewTags] = useState("")

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

  function handleAdd() {
    if (!newTitle.trim()) return
    addResource({
      category: newCategory || "General",
      title: newTitle,
      url: newUrl || undefined,
      description: newDescription,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
    })
    setNewTitle("")
    setNewUrl("")
    setNewCategory("")
    setNewDescription("")
    setNewTags("")
    setOpen(false)
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
                <Label htmlFor="res-url">URL (optional)</Label>
                <Input id="res-url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{resource.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{resource.description}</p>
                      </div>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={`Open ${resource.title} in new tab`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {resource.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
