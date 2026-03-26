import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none pointer-events-none select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border border-primary/15 dark:bg-primary/20 dark:border-primary/30",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/50 dark:bg-secondary/60",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30",
        outline:
          "bg-background text-muted-foreground border border-border/80 dark:bg-muted/30",
        success:
          "bg-success/10 text-success border border-success/20 dark:bg-success/20 dark:text-success dark:border-success/30",
        warning:
          "bg-warning/10 text-warning border border-warning/20 dark:bg-warning/20 dark:text-warning dark:border-warning/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span"> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }
>(({ className, variant, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };
