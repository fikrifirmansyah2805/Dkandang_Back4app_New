import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onNext: () => void;
  onPrev: () => void;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onNext, onPrev }: PaginationProps) {
  if (totalPages <= 1 && totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-600">
            Menampilkan <span className="font-bold text-slate-900">{totalItems === 0 ? 0 : startItem}</span> - <span className="font-bold text-slate-900">{endItem}</span> dari <span className="font-bold text-slate-900">{totalItems}</span> entri
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-lg shadow-xs" aria-label="Pagination">
            <button
              onClick={onPrev}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-slate-400 bg-white border border-slate-300 rounded-l-lg hover:bg-slate-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 focus:z-20">
              Hal {currentPage} / {totalPages}
            </div>
            <button
              onClick={onNext}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-slate-400 bg-white border border-slate-300 rounded-r-lg hover:bg-slate-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
