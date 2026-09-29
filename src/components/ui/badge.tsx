import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Status badges use a soft tinted background with a dark (light theme) or
// light (dark theme) text of the same hue, so they stay readable in both
// themes. Map domain states to these variants in src/lib/status.ts.
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-status-neutral/15 text-status-neutral-fg",
        destructive:
          "border-transparent bg-status-danger/15 text-status-danger-fg",
        success:
          "border-transparent bg-status-success/15 text-status-success-fg",
        warning:
          "border-transparent bg-status-pending/15 text-status-pending-fg",
        info:
          "border-transparent bg-status-info/15 text-status-info-fg",
        outline: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
