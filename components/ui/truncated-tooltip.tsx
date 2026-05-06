"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TruncatedTooltipProps {
  content: string
  className?: string
  tooltipClassName?: string
  as?: "p" | "span"
}

export function TruncatedTooltip({
  content,
  className,
  tooltipClassName,
  as = "span",
}: TruncatedTooltipProps) {
  const Comp = as

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Comp className={className}>{content}</Comp>
      </TooltipTrigger>
      <TooltipContent
        sideOffset={8}
        className={cn(
          "max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground shadow-xl",
          tooltipClassName
        )}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
