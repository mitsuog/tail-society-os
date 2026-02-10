'use client';

import { Search as SearchIcon, X } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce'; // Asegúrate de tener: npm i use-debounce
import { useRef } from 'react';

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    // Al buscar, siempre reseteamos a la página 1
    params.set('page', '1');
    
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const clearSearch = () => {
    if (inputRef.current) {
        inputRef.current.value = '';
    }
    handleSearch('');
  };

  return (
    <div className="relative flex flex-1 flex-shrink-0 w-full">
      <label htmlFor="search" className="sr-only">Buscar</label>
      
      {/* Icono Lupa */}
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      
      <input
        ref={inputRef}
        id="search"
        className="peer block w-full rounded-md border border-slate-200 py-2 pl-10 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all bg-white"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
        autoComplete="off"
      />

      {/* Botón Borrar (Solo visible si hay búsqueda) */}
      {searchParams.get('q') && (
        <button 
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
        >
            <X size={14} />
        </button>
      )}
    </div>
  );
}