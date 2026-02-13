'use client';

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateRangePicker({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detectar móvil
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. ESTADO INICIAL
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (fromParam && toParam) {
        return { from: new Date(fromParam), to: new Date(toParam) };
    }
    return {
        from: subDays(new Date(), 30),
        to: new Date(),
    };
  });

  // 2. APLICAR CAMBIOS
  const applyDate = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
        setDate(newDate); 
        const params = new URLSearchParams(searchParams.toString());
        params.set('from', format(newDate.from, 'yyyy-MM-dd'));
        params.set('to', format(newDate.to, 'yyyy-MM-dd'));
        router.push(`?${params.toString()}`, { scroll: false });
        setIsOpen(false);
    } else {
        setDate(newDate);
    }
  };

  const handlePreset = (days: number, label?: string) => {
      const today = new Date();
      if (label === 'Este Mes') {
          applyDate({ from: startOfMonth(today), to: endOfMonth(today) });
      } else if (label === 'Mes Pasado') {
          const lastMonth = subMonths(today, 1);
          applyDate({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
      } else {
          applyDate({ from: subDays(today, days), to: today });
      }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[260px] justify-start text-left font-normal bg-white border-slate-200 shadow-sm hover:bg-slate-50 truncate",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500 shrink-0" />
            <span className="truncate">
                {date?.from ? (
                date.to ? (
                    <span className="text-slate-700 font-medium">
                    {format(date.from, "dd MMM", { locale: es })} -{" "}
                    {format(date.to, "dd MMM", { locale: es })}
                    </span>
                ) : (
                    format(date.from, "dd MMM", { locale: es })
                )
                ) : (
                <span>Seleccionar periodo</span>
                )}
            </span>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[calc(100vw-32px)] sm:w-auto p-0" align="start" sideOffset={8}>
          <div className="flex flex-col sm:flex-row max-h-[85vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
              
              {/* Sidebar Presets */}
              <div className="p-2 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/50 flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-visible shrink-0 items-center sm:items-stretch min-w-[140px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:block">Rápido</span>
                  
                  <Button variant="ghost" size="sm" className="whitespace-nowrap sm:justify-start font-normal text-slate-600 h-8 px-3 bg-white sm:bg-transparent border sm:border-none shadow-sm sm:shadow-none" onClick={() => handlePreset(0)}>
                    Hoy
                  </Button>
                  <Button variant="ghost" size="sm" className="whitespace-nowrap sm:justify-start font-normal text-slate-600 h-8 px-3 bg-white sm:bg-transparent border sm:border-none shadow-sm sm:shadow-none" onClick={() => handlePreset(7)}>
                    7 días
                  </Button>
                  <Button variant="ghost" size="sm" className="whitespace-nowrap sm:justify-start font-normal text-slate-600 h-8 px-3 bg-white sm:bg-transparent border sm:border-none shadow-sm sm:shadow-none" onClick={() => handlePreset(30)}>
                    30 días
                  </Button>
                  <div className="w-px h-6 bg-slate-300 mx-1 sm:hidden" />
                  <div className="h-px bg-slate-200 my-1 hidden sm:block" />
                  
                  <Button variant="ghost" size="sm" className="whitespace-nowrap sm:justify-start font-normal text-slate-600 h-8 px-3 bg-white sm:bg-transparent border sm:border-none shadow-sm sm:shadow-none" onClick={() => handlePreset(0, 'Este Mes')}>
                    Este Mes
                  </Button>
                  <Button variant="ghost" size="sm" className="whitespace-nowrap sm:justify-start font-normal text-slate-600 h-8 px-3 bg-white sm:bg-transparent border sm:border-none shadow-sm sm:shadow-none" onClick={() => handlePreset(0, 'Mes Pasado')}>
                    Mes Pasado
                  </Button>
              </div>

              {/* Calendario */}
              <div className="p-0 sm:p-3 flex-1">
                <div className="flex justify-center">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={isMobile ? 1 : 2}
                        locale={es}
                        className="pointer-events-auto"
                        classNames={{
                            day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-md",
                            day_range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-700 rounded-none",
                            day_range_start: "rounded-r-none rounded-l-md",
                            day_range_end: "rounded-l-none rounded-r-md",
                            day_today: "bg-slate-100 text-slate-900 font-bold",
                        }}
                    />
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-2 p-3 sm:pt-3 sm:px-0 sm:pb-0 border-t border-slate-100 bg-white sm:bg-transparent sticky bottom-0 z-10">
                    <p className="text-xs text-slate-500 hidden sm:block">
                        {date?.from && date?.to ? 
                            `${format(date.from, 'dd MMM')} - ${format(date.to, 'dd MMM')}` : 
                            'Selecciona un rango'
                        }
                    </p>
                    <div className="flex w-full sm:w-auto gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-none">
                            Cancelar
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex-1 sm:flex-none" onClick={() => applyDate(date)}>
                            Aplicar
                        </Button>
                    </div>
                </div>
              </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}