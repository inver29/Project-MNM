import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-border/80 bg-background/82 px-4 py-3 text-[0.98rem] text-foreground shadow-sm ring-offset-background transition-[border-color,box-shadow,background-color] file:mr-4 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary placeholder:text-muted-foreground/90 focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 aria-[invalid=true]:border-destructive/55 aria-[invalid=true]:bg-destructive/5 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-destructive/10 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
