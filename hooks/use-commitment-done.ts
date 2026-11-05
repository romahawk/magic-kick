"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { commitmentDoneKey, type DatedCommitment } from "@/lib/commitments"
import { localDateISO } from "@/lib/weekly-plan"

/** P34 (ADR-039): which AIOS commitments are marked done, and a toggle. The mark lives on the profile; the OS file is never written. */
export function useCommitmentDone() {
  const keys = useAppStore((s) => s.profile.doneCommitments)
  const toggleCommitmentDone = useAppStore((s) => s.toggleCommitmentDone)
  const done = useMemo(() => new Set(keys ?? []), [keys])
  return {
    isDone: (entry: DatedCommitment) => done.has(commitmentDoneKey(entry)),
    toggle: (entry: DatedCommitment) => toggleCommitmentDone(commitmentDoneKey(entry), localDateISO()),
  }
}
