'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function ClientFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'newest';
  const currentSpecies = searchParams.get('species') || 'all';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    params.delete('page'); // Reseteamos página siempre
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 mb-4">
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
        <span className="text-xs font-bold text-slate-400 uppercase mr-2 hidden sm:inline">Filtrar:</span>
        <Button variant={currentSpecies === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => updateFilter('species', 'all')} className="text-xs">Todos</Button>
        <Button variant={currentSpecies === 'Perro' ? 'secondary' : 'ghost'} size="sm" onClick={() => updateFilter('species', 'Perro')} className="text-xs gap-1">🐶 Perros</Button>
        <Button variant={currentSpecies === 'Gato' ? 'secondary' : 'ghost'} size="sm" onClick={() => updateFilter('species', 'Gato')} className="text-xs gap-1">🐱 Gatos</Button>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-xs font-bold text-slate-400 uppercase mr-2 hidden sm:inline">Ordenar:</span>
        <select 
          className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm cursor-pointer focus:outline-none"
          value={currentSort}
          onChange={(e) => updateFilter('sort', e.target.value)}
        >
          <option value="newest">📅 Recientes (Registro)</option>
          <option value="last_visit">⏱️ Última Visita</option>
          <option value="oldest">📆 Antiguos (Registro)</option>
          <option value="alpha_asc">🔤 Nombre (A-Z)</option>
          <option value="alpha_desc">🔤 Nombre (Z-A)</option>
        </select>
      </div>
    </div>
  );
}