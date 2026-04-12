"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ReviewSkeleton from "@/components/ui/ReviewSkeleton";

interface Review {
  id: number;
  rating: number;
  comment?: string;
  feature: boolean | null;
  user: {
    name: string;
    email: string;
  };
  product: {
    name: string;
    image?: string;
  };
}

export default function ReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  const fetchReviews = async (page: number = 1) => {
    setLoading(true);
    const res = await fetch(`/api/reviews/feature?page=${page}&limit=${itemsPerPage}`);
    const data = await res.json();
    setReviews(data.data || []);
    setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews(currentPage);
  }, [currentPage]);

  const toggleFeature = async (id: number, current: boolean | null) => {
    await fetch("/api/reviews/feature", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        feature: !current,
      }),
    });

    fetchReviews(currentPage);
  };

  if (loading) return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold">Review Management</h1>
      <ReviewSkeleton />
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold">Review Management</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="flex flex-col justify-between rounded-xl border p-4 shadow-sm"
          >
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {r.product?.name}
              </h3>

              <p className="mt-2 text-sm">
                ⭐ {r.rating} / 5
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {r.comment}
              </p>

              <div className="mt-3 text-xs text-muted-foreground">
                By: {r.user?.name}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  r.feature
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {r.feature ? "Featured" : "Not Featured"}
              </span>

              <Button
                size="sm"
                variant={r.feature ? "destructive" : "default"}
                onClick={() => toggleFeature(r.id, r.feature)}
              >
                {r.feature ? "Remove" : "Feature"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}