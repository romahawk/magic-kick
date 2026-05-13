"use client"

import React from "react"
import { BrainCircuit, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
}

export class AiErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[AiErrorBoundary]", error, info.componentStack)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return <AiFallback onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}

export function AiFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <BrainCircuit className="h-4 w-4 shrink-0 opacity-50" />
      <span>AI unavailable</span>
      {onRetry && (
        <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={onRetry}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  )
}
