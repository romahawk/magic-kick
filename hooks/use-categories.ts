"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { withUsedCategories } from "@/lib/categories"

/** Every category to offer in pickers, filters and the manager (P14). */
export function useCategories() {
  const list = useAppStore((s) => s.profile.taskCategories)
  const tasks = useAppStore((s) => s.tasks)
  const goals = useAppStore((s) => s.goals)
  const projects = useAppStore((s) => s.projects)
  return useMemo(() => withUsedCategories(list, [...tasks, ...goals, ...projects]), [list, tasks, goals, projects])
}
