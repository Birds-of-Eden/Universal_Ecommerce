import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count === 2 && "sm:grid-cols-2", count === 3 && "sm:grid-cols-2 md:grid-cols-3", count === 4 && "sm:grid-cols-2 xl:grid-cols-4", count === 5 && "sm:grid-cols-2 xl:grid-cols-5")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <Pulse className="h-3 w-24" />
          <Pulse className="h-7 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3 border-b pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 py-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Pulse key={j} className={cn("h-4 flex-1", j === 0 && "w-24 flex-none")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <Pulse className="h-4 w-32" />
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse key={i} className={cn("h-3", i === lines - 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonNotifications({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}
