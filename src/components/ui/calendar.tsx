"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-slate-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-slate-200 hover:bg-slate-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        
        // CORRECCIÓN: Usamos Grid para forzar alineación perfecta de columnas
        head_row: "grid grid-cols-7 mb-2", 
        head_cell: "text-slate-400 rounded-md font-normal text-[0.8rem] w-full text-center", // w-full deja que el grid mande
        
        row: "grid grid-cols-7 mt-2 w-full",
        
        // CELDAS: El contenedor toma el ancho del grid, el contenido se centra
        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        
        // BOTÓN DEL DÍA: Tamaño fijo y centrado (mx-auto)
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 hover:text-slate-900 mx-auto" 
        ),
        
        day_range_end: "day-range-end",
        
        // ESTILOS SELECCIONADOS
        day_selected:
          "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white",
        day_today: "bg-slate-100 text-slate-900 font-bold",
        day_outside:
          "day-outside text-slate-300 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30",
        day_disabled: "text-slate-300 opacity-50",
        day_range_middle:
          "aria-selected:bg-slate-100 aria-selected:text-slate-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
            const Icon = orientation === "left" ? ChevronLeft : ChevronRight
            return <Icon className="h-4 w-4" /> 
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }