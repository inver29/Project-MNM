import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[132px] w-full rounded-2xl border border-border/80 bg-background/82 px-4 py-3 text-[0.98rem] leading-7 text-foreground shadow-sm ring-offset-background transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/90 focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 aria-[invalid=true]:border-destructive/55 aria-[invalid=true]:bg-destructive/5 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-destructive/10 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
