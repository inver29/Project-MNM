import * as React from "react";

import { cn } from "@/lib/utils";

interface FilePickerProps extends Omit<React.ComponentProps<"input">, "type"> {
  buttonLabel?: string;
  placeholder?: string;
  fileName?: string;
}

const FilePicker = React.forwardRef<HTMLInputElement, FilePickerProps>(
  (
    {
      className,
      buttonLabel = "Chọn tệp",
      placeholder = "Chưa chọn tệp nào",
      fileName,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = React.useId();

    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-2xl border border-border/80 bg-background/82 px-3 py-2 shadow-sm transition-[border-color,box-shadow,background-color] focus-within:border-primary/35 focus-within:ring-4 focus-within:ring-primary/10",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <label
          htmlFor={inputId}
          className={cn(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary/65 px-4 text-[0.95rem] font-semibold text-primary transition-colors",
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-secondary",
          )}
        >
          {buttonLabel}
        </label>
        <span className="min-w-0 truncate text-[0.95rem] leading-6 text-muted-foreground">
          {fileName || placeholder}
        </span>
        <input id={inputId} ref={ref} type="file" className="sr-only" disabled={disabled} {...props} />
      </div>
    );
  },
);

FilePicker.displayName = "FilePicker";

export { FilePicker };
