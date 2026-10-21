'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

import { cn } from '@/lib/utils'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
      // An open Sheet or Dialog sets pointer-events: none on <body>; toasts (and their Undo) stay clickable.
      toastOptions={{ ...props.toastOptions, className: cn('pointer-events-auto', props.toastOptions?.className) }}
    />
  )
}

export { Toaster }
