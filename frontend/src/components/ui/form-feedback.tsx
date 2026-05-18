import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const FormAlert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    if (!children) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-[1.25rem] border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-sm",
          className,
        )}
        {...props}
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 leading-relaxed">{children}</div>
      </div>
    );
  },
);
FormAlert.displayName = "FormAlert";

const FieldError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    if (!children) {
      return null;
    }

    return (
      <p
        ref={ref}
        role="alert"
        className={cn("text-sm font-medium leading-6 text-destructive", className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);
FieldError.displayName = "FieldError";

export { FieldError, FormAlert };
