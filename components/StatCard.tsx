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
      <span className={positive ? "text-positive" : "text-destructive"}>
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
  // Get gradient class based on tone
  const getGradientClass = () => {
    switch (tone) {
      case "good":
        return "bg-gradient-good";
      case "warn":
        return "bg-gradient-warn";
      case "danger":
        return "bg-gradient-danger";
      default:
        return "bg-gradient-default";
    }
  };

  // Get status color class based on tone
  const getStatusColorClass = () => {
    switch (tone) {
      case "good":
        return "text-status-good";
      case "warn":
        return "text-status-warn";
      case "danger":
        return "text-status-danger";
      default:
        return "text-foreground";
    }
  };

  // Get indicator color class based on tone
  const getIndicatorClass = () => {
    switch (tone) {
      case "good":
        return "bg-status-good";
      case "warn":
        return "bg-status-warn";
      case "danger":
        return "bg-status-danger";
      default:
        return "bg-primary";
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/95 p-2 sm:p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradientClass()}`} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-[14px] sm:text-xs font-medium text-foreground">
              {label}
            </p>

            {tone !== "default" && (
              <div className={`h-1.5 w-1.5 rounded-full ${getIndicatorClass()}`} />
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
          className={`rounded-lg border border-border/70 bg-background/80 p-1.5 sm:p-2 shadow-sm ${getStatusColorClass()}`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </div>
    </article>
  );
}

export type { StatCardProps };