import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  asideClassName?: string;
}

interface PageSectionProps {
  children: ReactNode;
  className?: string;
}

interface PageStatProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

interface PageNoteProps {
  title?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
  bodyClassName,
  asideClassName,
}: PageIntroProps) {
  return (
    <section className={cn("page-hero page-intro", className)}>
      <div className={cn("page-intro-body", bodyClassName)}>
        <div className="space-y-3">
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="panel-title max-w-4xl">{title}</h1>
          {description ? <p className="section-copy max-w-3xl">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {aside ? <div className={cn("page-intro-aside", asideClassName)}>{aside}</div> : null}
    </section>
  );
}

export function PageStatGrid({ children, className }: PageSectionProps) {
  return <div className={cn("page-stat-grid", className)}>{children}</div>;
}

export function PageStat({ label, value, caption, icon, className }: PageStatProps) {
  return (
    <div className={cn("page-stat-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="info-label">{label}</p>
          <p className="page-stat-value">{value}</p>
        </div>
        {icon ? <div className="shrink-0 text-primary/70">{icon}</div> : null}
      </div>
      {caption ? <p className="mt-2 text-[0.93rem] leading-6 text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

export function PageNote({ title, children, className, contentClassName }: PageNoteProps) {
  return (
    <div className={cn("page-note", className)}>
      {title ? <p className="panel-subtitle text-[1.02rem]">{title}</p> : null}
      <div className={cn("space-y-2 text-[0.96rem] leading-7 text-muted-foreground", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
