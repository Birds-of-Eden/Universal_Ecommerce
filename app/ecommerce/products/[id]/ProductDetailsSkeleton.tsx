export default function ProductDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square w-full animate-pulse rounded-none bg-muted" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-20 w-20 animate-pulse rounded-none bg-muted"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-10 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-28 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
