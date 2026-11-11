import { useState, useMemo, useEffect } from 'react';

export function usePagination<T>(data: T[], itemsPerPage = 25) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  // Reset to safe page if out of bounds (e.g. after filter changes)
  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const currentData = useMemo(() => {
    const begin = (safeCurrentPage - 1) * itemsPerPage;
    const end = begin + itemsPerPage;
    return data.slice(begin, end);
  }, [data, safeCurrentPage, itemsPerPage]);

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return {
    currentPage: safeCurrentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    currentData,
    nextPage,
    prevPage,
    setCurrentPage,
  };
}
