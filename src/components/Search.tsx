//tail-society-os/src/components/Search.tsx

'use client'; // Esto se ejecuta en el navegador

import { Search as SearchIcon } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce'; // Necesitaremos instalar esto: npm i use-debounce

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Espera 300ms a que dejes de escribir para buscar (para no saturar)
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">Buscar</label>
      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
      <input
        className="peer block w-full rounded-md border border-slate-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
      />
    </div>
  );
}