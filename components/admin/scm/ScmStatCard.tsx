"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ScmStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "critical" | "warning" | "success";
  className?: string;
};

const toneClasses: Record<NonNullable<ScmStatCardProps["tone"]>, string> = {
  default: "border-border bg-card",
  critical: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/30 bg-warning/5",
  success: "border-success/30 bg-success/5",
};

const getIconContainerClasses = (tone: NonNullable<ScmStatCardProps["tone"]>) => {
  const baseClasses = "rounded-xl border p-2 sm:p-2.5 shrink-0 transition-all duration-200";
  
  switch (tone) {
    case "critical":
      return cn(baseClasses, "border-destructive/30 bg-destructive/10 text-destructive");
    case "warning":
      return cn(baseClasses, "border-warning/30 bg-warning/10 text-warning");
    case "success":
      return cn(baseClasses, "border-success/30 bg-success/10 text-success");
    default:
      return cn(baseClasses, "border-border/70 bg-background/80 text-foreground");
  }
};

const getValueClasses = (tone: NonNullable<ScmStatCardProps["tone"]>) => {
  switch (tone) {
    case "critical":
      return "text-destructive";
    case "warning":
      return "text-warning";
    case "success":
      return "text-success";
    default:
      return "text-foreground";
  }
};

export function ScmStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: ScmStatCardProps) {
  return (
    <Card className={cn(
      "shadow-none transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      toneClasses[tone],
      className
    )}>
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-5">
        {/* Left Content - Responsive */}
        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
          {/* Label */}
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.15em] sm:tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          
          {/* Value - Responsive font sizes */}
          <p className={cn(
            "text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight break-words",
            getValueClasses(tone)
          )}>
            {value}
          </p>
          
          {/* Hint - Responsive */}
          {hint && (
            <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">
              {hint}
            </p>
          )}
        </div>

        {/* Icon - Responsive */}
        {Icon && (
          <div className={getIconContainerClasses(tone)}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}