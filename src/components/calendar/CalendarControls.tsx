'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarControlsProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: 'day' | '3day' | 'week' | 'month';
  onViewChange: (view: 'day' | '3day' | 'week' | 'month') => void;
}

export default function CalendarControls({ currentDate, onDateChange, view, onViewChange }: CalendarControlsProps) {
  
  const handleNav = (direction: 'prev' | 'next') => {
    const daysToAdd = direction === 'next' ? 1 : -1;
    const newDate = new Date(currentDate);
    
    if (view === 'week') newDate.setDate(newDate.getDate() + (daysToAdd * 7));
    else if (view === '3day') newDate.setDate(newDate.getDate() + (daysToAdd * 3));
    else if (view === 'month') newDate.setMonth(newDate.getMonth() + daysToAdd);
    else newDate.setDate(newDate.getDate() + daysToAdd);

    onDateChange(newDate);
  };

  const handleToday = () => onDateChange(new Date());

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
      
      {/* 1. Navegación y Fecha */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center bg-slate-50 rounded-md border border-slate-200">
          <Button variant="ghost" size="icon" onClick={() => handleNav('prev')} className="h-8 w-8 hover:bg-white">
            <ChevronLeft size={16} />
          </Button>
          <div className="px-4 min-w-[180px] text-center font-bold text-slate-800 capitalize text-sm select-none">
            {view === 'month' 
              ? format(currentDate, "MMMM yyyy", { locale: es }) 
              : format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleNav('next')} className="h-8 w-8 hover:bg-white">
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">Hoy</Button>
      </div>

      {/* 2. Selector de Vistas */}
      <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
        <div className="flex bg-slate-100 p-1 rounded-md">
            {[
                { id: 'day', label: 'Día' },
                { id: '3day', label: '3 Días' },
                { id: 'week', label: 'Semana' },
            ].map((v) => (
                <button
                    key={v.id}
                    onClick={() => onViewChange(v.id as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                        view === v.id 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {v.label}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
}