'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
    selectedWeek: { from: Date; to: Date };
    onWeekChange: (week: { from: Date; to: Date }) => void;
    disabled?: boolean;
}

export function WeekSelector({ selectedWeek, onWeekChange, disabled }: WeekSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    // Estado para controlar qué mes estamos viendo en el calendario
    const [viewDate, setViewDate] = useState(selectedWeek.from);

    // [CORRECCIÓN CLAVE] 
    // Si la semana seleccionada cambia externamente (ej. con las flechas de afuera),
    // actualizamos la vista del calendario para que muestre el mes correcto.
    useEffect(() => {
        if (isOpen) {
            setViewDate(selectedWeek.from);
        }
    }, [isOpen, selectedWeek.from]);

    const handlePrevWeek = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newFrom = subWeeks(selectedWeek.from, 1);
        const newTo = subWeeks(selectedWeek.to, 1);
        onWeekChange({ from: newFrom, to: newTo });
    };

    const handleNextWeek = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newFrom = addWeeks(selectedWeek.from, 1);
        const newTo = addWeeks(selectedWeek.to, 1);
        onWeekChange({ from: newFrom, to: newTo });
    };

    const goToCurrentWeek = () => {
        const now = new Date();
        const from = startOfWeek(now, { weekStartsOn: 1 });
        const to = endOfWeek(now, { weekStartsOn: 1 });
        onWeekChange({ from, to });
        setViewDate(now);
        setIsOpen(false);
    };

    // Generador de días más robusto usando date-fns
    const generateMonthDays = () => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Agrupar en semanas
        const weeks: Date[][] = [];
        let currentWeek: Date[] = [];

        days.forEach((day) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });
        return weeks;
    };

    const isWeekSelected = (weekStart: Date) => isSameDay(weekStart, selectedWeek.from);
    const weeks = generateMonthDays();

    return (
        <div className="relative">
            {/* --- CONTROLES VISIBLES --- */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm p-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevWeek}
                    disabled={disabled}
                    className="h-8 w-8 hover:bg-slate-100 text-slate-500 rounded-sm"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "flex items-center justify-center gap-2 px-3 h-8",
                        "hover:bg-slate-50 transition-colors min-w-[200px]",
                        "text-sm font-medium text-slate-700",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                    <span className="capitalize">
                        {format(selectedWeek.from, "d MMM", { locale: es })} - {format(selectedWeek.to, "d MMM yyyy", { locale: es })}
                    </span>
                </button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextWeek}
                    disabled={disabled}
                    className="h-8 w-8 hover:bg-slate-100 text-slate-500 rounded-sm"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* --- CALENDARIO FLOTANTE --- */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    
                    <Card className="absolute top-full left-0 mt-2 z-50 p-4 w-[320px] shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-100">
                        {/* Navegación de Mes */}
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewDate(subWeeks(viewDate, 4))}
                                className="h-7 w-7"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <span className="text-sm font-semibold capitalize text-slate-900">
                                {format(viewDate, "MMMM yyyy", { locale: es })}
                            </span>
                            
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewDate(addWeeks(viewDate, 4))}
                                className="h-7 w-7"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Encabezado de Días */}
                        <div className="grid grid-cols-7 mb-2 text-center">
                            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((day) => (
                                <div key={day} className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Grid de Semanas */}
                        <div className="space-y-1">
                            {weeks.map((week, idx) => {
                                const weekStart = week[0];
                                const weekEnd = week[6];
                                const isSelected = isWeekSelected(weekStart);

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            onWeekChange({ from: weekStart, to: weekEnd });
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "grid grid-cols-7 text-center py-1 cursor-pointer rounded-md transition-all group",
                                            isSelected 
                                                ? "bg-blue-600 shadow-md scale-[1.02]" 
                                                : "hover:bg-slate-100"
                                        )}
                                    >
                                        {week.map((day, dayIdx) => (
                                            <div
                                                key={dayIdx}
                                                className={cn(
                                                    "text-sm h-7 w-7 flex items-center justify-center mx-auto rounded-full",
                                                    isSelected && "text-white font-semibold",
                                                    !isSelected && !isSameMonth(day, viewDate) && "text-slate-300",
                                                    !isSelected && isSameMonth(day, viewDate) && "text-slate-700",
                                                    !isSelected && isSameDay(day, new Date()) && "bg-blue-50 text-blue-600 font-bold"
                                                )}
                                            >
                                                {format(day, 'd')}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={goToCurrentWeek}
                            >
                                Ir a esta semana
                            </Button>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}