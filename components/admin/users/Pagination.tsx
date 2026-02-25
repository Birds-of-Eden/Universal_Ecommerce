'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 px-2 py-4 bg-[#EEEFE0] rounded-xl border border-[#D1D8BE] shadow-sm">
      {/* Page Info */}
      <div className="text-sm text-[#2C4A3B] font-medium">
        পৃষ্ঠা {currentPage} এর {totalPages} - মোট {totalPages} পৃষ্ঠা
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-[#D1D8BE] bg-white text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#819A91] transition-all duration-300 shadow-sm"
          title="প্রথম পৃষ্ঠা"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-[#D1D8BE] bg-white text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#819A91] transition-all duration-300 shadow-sm"
          title="আগের পৃষ্ঠা"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Start Ellipsis */}
        {startPage > 1 && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-2 rounded-lg border border-[#D1D8BE] bg-white text-[#2C4A3B] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] transition-all duration-300 shadow-sm text-sm font-medium"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="px-2 text-[#819A91]">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )}
          </div>
        )}

        {/* Page Numbers */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300 shadow-sm ${
              page === currentPage
                ? 'bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-[#EEEFE0] border-[#2C4A3B] shadow-md transform scale-105'
                : 'border-[#D1D8BE] bg-white text-[#2C4A3B] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91]'
            }`}
          >
            {page}
          </button>
        ))}

        {/* End Ellipsis */}
        {endPage < totalPages && (
          <div className="flex items-center space-x-1">
            {endPage < totalPages - 1 && (
              <span className="px-2 text-[#819A91]">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-2 rounded-lg border border-[#D1D8BE] bg-white text-[#2C4A3B] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] transition-all duration-300 shadow-sm text-sm font-medium"
            >
              {totalPages}
            </button>
          </div>
        )}

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-[#D1D8BE] bg-white text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#819A91] transition-all duration-300 shadow-sm"
          title="পরের পৃষ্ঠা"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-[#D1D8BE] bg-white text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#819A91] transition-all duration-300 shadow-sm"
          title="শেষ পৃষ্ঠা"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}