'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
    selectedWeek: { from: Date; to: Date };
    onWeekChange: (week: { from: Date; to: Date }) => void;
    disabled?: boolean;
}

export function WeekSelector({ selectedWeek, onWeekChange, disabled }: WeekSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(selectedWeek.from);

    const handlePrevWeek = () => {
        const newFrom = subWeeks(selectedWeek.from, 1);
        const newTo = subWeeks(selectedWeek.to, 1);
        onWeekChange({ from: newFrom, to: newTo });
    };

    const handleNextWeek = () => {
        const newFrom = addWeeks(selectedWeek.from, 1);
        const newTo = addWeeks(selectedWeek.to, 1);
        onWeekChange({ from: newFrom, to: newTo });
    };

    const goToCurrentWeek = () => {
        const now = new Date();
        const from = startOfWeek(now, { weekStartsOn: 1 });
        const to = endOfWeek(now, { weekStartsOn: 1 });
        onWeekChange({ from, to });
        setIsOpen(false);
    };

    // Generar semanas para el mini calendario
    const generateWeeks = () => {
        const weeks: Date[][] = [];
        const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
        
        let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        
        while (currentWeekStart <= monthEnd) {
            const weekDays: Date[] = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(currentWeekStart);
                day.setDate(day.getDate() + i);
                weekDays.push(day);
            }
            weeks.push(weekDays);
            currentWeekStart = addWeeks(currentWeekStart, 1);
        }
        
        return weeks;
    };

    const isWeekSelected = (weekStart: Date) => {
        return weekStart.getTime() === selectedWeek.from.getTime();
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === viewDate.getMonth();
    };

    const weeks = generateWeeks();

    return (
        <div className="relative">
            {/* Selector compacto */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevWeek}
                    disabled={disabled}
                    className="h-9 w-9 hover:bg-slate-100"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border bg-white",
                        "hover:bg-slate-50 transition-colors min-w-[280px] justify-center",
                        "border-slate-200 shadow-sm",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-900">
                        {format(selectedWeek.from, "dd MMM", { locale: es })}
                        {' - '}
                        {format(selectedWeek.to, "dd MMM yyyy", { locale: es })}
                    </span>
                </button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextWeek}
                    disabled={disabled}
                    className="h-9 w-9 hover:bg-slate-100"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Mini calendario desplegable */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Calendario */}
                    <Card className="absolute top-full mt-2 z-50 p-4 shadow-xl border-slate-200 w-[360px] left-1/2 -translate-x-1/2">
                        {/* Header del mes */}
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                                className="h-8 w-8"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <span className="font-semibold text-sm text-slate-900">
                                {format(viewDate, "MMMM yyyy", { locale: es })}
                            </span>
                            
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                                className="h-8 w-8"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Días de la semana */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                                <div
                                    key={i}
                                    className="text-center text-xs font-medium text-slate-500 py-1"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Semanas */}
                        <div className="space-y-1">
                            {weeks.map((week, weekIdx) => {
                                const weekStart = startOfWeek(week[0], { weekStartsOn: 1 });
                                const weekEnd = endOfWeek(week[0], { weekStartsOn: 1 });
                                const selected = isWeekSelected(weekStart);

                                return (
                                    <button
                                        key={weekIdx}
                                        onClick={() => {
                                            onWeekChange({ from: weekStart, to: weekEnd });
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "grid grid-cols-7 gap-1 w-full rounded-md p-1 transition-colors",
                                            selected ? "bg-blue-50 ring-2 ring-blue-500" : "hover:bg-slate-50"
                                        )}
                                    >
                                        {week.map((day, dayIdx) => (
                                            <div
                                                key={dayIdx}
                                                className={cn(
                                                    "text-center text-sm py-1.5 rounded-md transition-colors",
                                                    selected && "bg-blue-500 text-white font-medium",
                                                    !selected && isCurrentMonth(day) && "text-slate-900",
                                                    !selected && !isCurrentMonth(day) && "text-slate-300",
                                                    !selected && "hover:bg-slate-100"
                                                )}
                                            >
                                                {format(day, 'd')}
                                            </div>
                                        ))}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer con botón de semana actual */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToCurrentWeek}
                                className="w-full text-xs"
                            >
                                Ir a semana actual
                            </Button>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
