"use client"

import { useAppStore } from "@/lib/store"
import { categoryColor } from "@/lib/categories"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

/** Renders a task or goal category in its color. The only way a category is shown (P14). */
export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const colors = useAppStore((s) => s.profile.taskCategoryColors)
  return (
    <Badge className={cn("border-transparent", className)} style={{ backgroundColor: categoryColor(category, colors), color: "#ffffff" }}>
      {category}
    </Badge>
  )
}
