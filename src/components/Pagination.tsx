//tail-society-os/src/components/Pagination.tsx

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* Botón Anterior */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={createPageURL(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Link>
        ) : (
          <span><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</span>
        )}
      </Button>

      <span className="text-sm text-slate-500 font-medium">
        Página {currentPage} de {totalPages || 1}
      </span>

      {/* Botón Siguiente */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={createPageURL(currentPage + 1)}>
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        ) : (
          <span>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></span>
        )}
      </Button>
    </div>
  );
}