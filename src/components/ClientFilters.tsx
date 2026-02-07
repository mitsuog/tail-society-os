//tail-society-os/src/components/ClientFilters.tsx

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';

export default function ClientFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'newest';
  const currentSpecies = searchParams.get('species') || 'all';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    params.delete('page'); // Reset page on filter change
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
      
      {/* Species Filter */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <SlidersHorizontal size={14} />
          <span>Especie:</span>
        </div>
        <div className="flex gap-1.5">
          <Button 
            variant={currentSpecies === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => updateFilter('species', 'all')} 
            className={currentSpecies === 'all' ? 'bg-slate-900 hover:bg-slate-800' : 'hover:bg-slate-100'}
          >
            Todos
          </Button>
          <Button 
            variant={currentSpecies === 'Perro' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => updateFilter('species', 'Perro')} 
            className={currentSpecies === 'Perro' ? 'bg-slate-900 hover:bg-slate-800' : 'hover:bg-slate-100'}
          >
            🐶 Perros
          </Button>
          <Button 
            variant={currentSpecies === 'Gato' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => updateFilter('species', 'Gato')} 
            className={currentSpecies === 'Gato' ? 'bg-slate-900 hover:bg-slate-800' : 'hover:bg-slate-100'}
          >
            🐱 Gatos
          </Button>
        </div>
      </div>

      {/* Divider - Hidden on mobile */}
      <div className="hidden sm:block w-px h-8 bg-slate-200" />

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <ArrowUpDown size={14} />
          <span>Ordenar:</span>
        </div>
        <Select value={currentSort} onValueChange={(value) => updateFilter('sort', value)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm border-slate-300">
            <SelectValue placeholder="Seleccionar orden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">📅 Más Recientes</SelectItem>
            <SelectItem value="last_visit">⏱️ Última Visita</SelectItem>
            <SelectItem value="oldest">📆 Más Antiguos</SelectItem>
            <SelectItem value="name_asc">🔤 Nombre (A-Z)</SelectItem>
            <SelectItem value="name_desc">🔤 Nombre (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
