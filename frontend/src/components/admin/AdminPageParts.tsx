import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "info";

const toneAccentClasses: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  info: "bg-sky-600",
};

interface AdminHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

interface AdminMetricCardProps {
  label: string;
  value: ReactNode;
  tone?: Tone;
}

interface AdminSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface AdminShellProps {
  children: ReactNode;
  className?: string;
}

export const adminStickyActionHeaderClassName =
  "sticky right-0 z-20 border-l border-border/70 bg-secondary/85 shadow-[-14px_0_24px_-20px_hsl(var(--foreground)/0.45)] backdrop-blur";
export const adminStickyActionCellClassName =
  "sticky right-0 z-10 border-l border-border/70 bg-background/95 shadow-[-14px_0_24px_-20px_hsl(var(--foreground)/0.45)] transition-colors group-hover:bg-secondary/35";

export function AdminPage({ children, className }: AdminShellProps) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function AdminMetricsGrid({ children, className }: AdminShellProps) {
  return <div className={cn("grid gap-3 md:grid-cols-2 2xl:grid-cols-4", className)}>{children}</div>;
}

export function AdminToolbarInfo({ children, className }: AdminShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center rounded-[1rem] border border-border/70 bg-background/70 px-4 text-[0.94rem] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminDataSurface({ children, className }: AdminShellProps) {
  return <div className={cn("overflow-hidden rounded-[1.15rem] border border-border/70 bg-background/75", className)}>{children}</div>;
}

export function AdminHero({ eyebrow, title, description, actions }: AdminHeroProps) {
  return (
    <section className="page-hero">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="panel-title max-w-4xl">{title}</h1>
          <p className="section-copy max-w-3xl">{description}</p>
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

export function AdminMetricCard({ label, value, tone = "primary" }: AdminMetricCardProps) {
  return (
    <div className="section-shell h-full p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-[0.94rem] font-medium leading-6 text-foreground/72">{label}</p>
          <p className="break-words text-[1.45rem] font-semibold leading-none tracking-tight tabular-nums md:text-[1.6rem]">
            {value}
          </p>
        </div>
        <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", toneAccentClasses[tone])} />
      </div>
    </div>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn("section-shell p-4 md:p-5", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-[1.22rem] font-semibold tracking-tight md:text-[1.32rem]">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-[0.96rem] leading-7 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-border/80 bg-secondary/20 px-6 py-9 text-center text-[0.98rem] text-muted-foreground">
      {children}
    </div>
  );
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("section-shell p-4", className)}>{children}</section>;
}
