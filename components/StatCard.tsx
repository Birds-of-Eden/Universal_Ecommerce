"use client";

import { LucideIcon } from "lucide-react";

type Tone = "default" | "good" | "warn" | "danger";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  compareLabel: string;
  hint?: string;
  tone?: Tone;
}

function MiniTrend({
  value,
  compareLabel,
}: {
  value?: number;
  compareLabel: string;
}) {
  if (typeof value !== "number") {
    return (
      <span className="text-xs text-muted-foreground">{compareLabel}</span>
    );
  }

  const positive = value >= 0;
  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={
          positive
            ? "text-emerald-500 dark:text-emerald-400 [&:where(.theme-green)]:text-[hsl(var(--analytics-chart-1))] [&:where(.theme-plum)]:text-[hsl(var(--analytics-chart-1))] [&:where(.theme-olive)]:text-[hsl(var(--analytics-chart-2))] [&:where(.theme-rose)]:text-[hsl(var(--analytics-chart-2))]"
            : "text-destructive"
        }
      >
        {positive ? "+" : "-"}
      </span>
      <span className="font-medium text-foreground">
        {Math.abs(value).toFixed(1)}%
      </span>
      <span className="text-muted-foreground">{compareLabel}</span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  compareLabel,
  hint,
  tone = "default",
}: StatCardProps) {
  const accent =
    tone === "good"
      ? "from-emerald-200/60 to-emerald-100/40 [&:where(.theme-green)]:from-[hsl(var(--analytics-chart-1))/0.25] [&:where(.theme-green)]:to-[hsl(var(--analytics-chart-1))/0.12] [&:where(.theme-plum)]:from-[hsl(var(--analytics-chart-1))/0.25] [&:where(.theme-plum)]:to-[hsl(var(--analytics-chart-1))/0.12] [&:where(.theme-olive)]:from-[hsl(var(--analytics-chart-2))/0.25] [&:where(.theme-olive)]:to-[hsl(var(--analytics-chart-2))/0.12] [&:where(.theme-rose)]:from-[hsl(var(--analytics-chart-2))/0.25] [&:where(.theme-rose)]:to-[hsl(var(--analytics-chart-2))/0.12]"
      : tone === "warn"
        ? "from-amber-200/60 to-amber-100/40 [&:where(.theme-green)]:from-[hsl(var(--analytics-chart-3))/0.25] [&:where(.theme-green)]:to-[hsl(var(--analytics-chart-3))/0.12] [&:where(.theme-plum)]:from-[hsl(var(--analytics-chart-3))/0.25] [&:where(.theme-plum)]:to-[hsl(var(--analytics-chart-3))/0.12] [&:where(.theme-olive)]:from-[hsl(var(--analytics-accent))/0.25] [&:where(.theme-olive)]:to-[hsl(var(--analytics-accent))/0.12] [&:where(.theme-rose)]:from-[hsl(var(--analytics-chart-4))/0.25] [&:where(.theme-rose)]:to-[hsl(var(--analytics-chart-4))/0.12]"
        : tone === "danger"
          ? "from-red-200/60 to-red-100/40 [&:where(.theme-green)]:from-[hsl(var(--analytics-chart-5))/0.25] [&:where(.theme-green)]:to-[hsl(var(--analytics-chart-5))/0.12] [&:where(.theme-plum)]:from-[hsl(var(--analytics-chart-5))/0.25] [&:where(.theme-plum)]:to-[hsl(var(--analytics-chart-5))/0.12] [&:where(.theme-olive)]:from-[hsl(var(--analytics-chart-4))/0.25] [&:where(.theme-olive)]:to-[hsl(var(--analytics-chart-4))/0.12] [&:where(.theme-rose)]:from-[hsl(var(--analytics-chart-3))/0.25] [&:where(.theme-rose)]:to-[hsl(var(--analytics-chart-3))/0.12]"
          : "from-blue-200/60 to-blue-100/40 [&:where(.theme-green)]:from-[hsl(var(--analytics-primary))/0.25] [&:where(.theme-green)]:to-[hsl(var(--analytics-primary))/0.12] [&:where(.theme-plum)]:from-[hsl(var(--analytics-primary))/0.25] [&:where(.theme-plum)]:to-[hsl(var(--analytics-primary))/0.12] [&:where(.theme-olive)]:from-[hsl(var(--analytics-primary))/0.25] [&:where(.theme-olive)]:to-[hsl(var(--analytics-primary))/0.12] [&:where(.theme-rose)]:from-[hsl(var(--analytics-primary))/0.25] [&:where(.theme-rose)]:to-[hsl(var(--analytics-primary))/0.12]";

  const statusColor =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400 [&:where(.theme-green)]:text-[hsl(var(--analytics-chart-1))] [&:where(.theme-plum)]:text-[hsl(var(--analytics-chart-1))] [&:where(.theme-olive)]:text-[hsl(var(--analytics-chart-2))] [&:where(.theme-rose)]:text-[hsl(var(--analytics-chart-2))]"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400 [&:where(.theme-green)]:text-[hsl(var(--analytics-chart-3))] [&:where(.theme-plum)]:text-[hsl(var(--analytics-chart-3))] [&:where(.theme-olive)]:text-[hsl(var(--analytics-accent))] [&:where(.theme-rose)]:text-[hsl(var(--analytics-chart-4))]"
        : tone === "danger"
          ? "text-destructive [&:where(.theme-green)]:text-[hsl(var(--analytics-chart-5))] [&:where(.theme-plum)]:text-[hsl(var(--analytics-chart-5))] [&:where(.theme-olive)]:text-[hsl(var(--analytics-chart-4))] [&:where(.theme-rose)]:text-[hsl(var(--analytics-chart-3))]"
          : "text-foreground";

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/95 p-2 sm:p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-[14px] sm:text-xs font-medium text-foreground">
              {label}
            </p>

            {tone !== "default" && (
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  tone === "good"
                    ? "bg-emerald-500 [&:where(.theme-green)]:bg-[hsl(var(--analytics-chart-1))] [&:where(.theme-plum)]:bg-[hsl(var(--analytics-chart-1))] [&:where(.theme-olive)]:bg-[hsl(var(--analytics-chart-2))] [&:where(.theme-rose)]:bg-[hsl(var(--analytics-chart-2))]"
                    : tone === "warn"
                      ? "bg-amber-500 [&:where(.theme-green)]:bg-[hsl(var(--analytics-chart-3))] [&:where(.theme-plum)]:bg-[hsl(var(--analytics-chart-3))] [&:where(.theme-olive)]:bg-[hsl(var(--analytics-accent))] [&:where(.theme-rose)]:bg-[hsl(var(--analytics-chart-4))]"
                      : "bg-destructive [&:where(.theme-green)]:bg-[hsl(var(--analytics-chart-5))] [&:where(.theme-plum)]:bg-[hsl(var(--analytics-chart-5))] [&:where(.theme-olive)]:bg-[hsl(var(--analytics-chart-4))] [&:where(.theme-rose)]:bg-[hsl(var(--analytics-chart-3))]"
                }`}
              />
            )}
          </div>

          <p className="mt-1 text-sm sm:text-lg md:text-xl font-bold tracking-tight text-foreground">
            {value}
          </p>

          <div className="mt-1">
            {typeof trend === "number" ? (
              <MiniTrend value={trend} compareLabel={compareLabel} />
            ) : (
              <span className="line-clamp-1 text-[9px] sm:text-[11px] text-muted-foreground">
                {hint || compareLabel}
              </span>
            )}
          </div>
        </div>

        <div
          className={`rounded-lg border border-border/70 bg-background/80 p-1.5 sm:p-2 shadow-sm ${statusColor}`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </div>
    </article>
  );
}

export type { StatCardProps };
