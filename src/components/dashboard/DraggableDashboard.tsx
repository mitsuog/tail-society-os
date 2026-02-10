'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings2, Plus, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { WIDGET_CATALOG, WidgetId, DashboardData } from './WidgetRegistry';

interface DraggableDashboardProps {
  initialLayout: string[];
  userRole?: string;
  data: DashboardData;
  availableWidgets?: string[]; // Lista de todos los posibles
}

// COMPONENTE SORTABLE ITEM
function SortableItem({ id, children, colSpan = 1, onRemove }: { id: string; children: React.ReactNode; colSpan?: number, onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  // Clases para grid responsivo
  const colSpanClass = colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1';

  return (
    <div ref={setNodeRef} style={style} className={`${colSpanClass} relative group h-full`}>
      {/* Botón de Arrastre (visible en hover) */}
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-20 p-1.5 bg-white/80 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={14} className="text-slate-400" />
      </div>
      
      {/* Botón de Eliminar (visible en hover) */}
      {/* <div onClick={onRemove} className="absolute top-2 right-10 z-20 p-1.5 bg-white/80 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 cursor-pointer text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
         <X size={14} />
      </div> */}
      
      {children}
    </div>
  );
}

export default function DraggableDashboard({ initialLayout, userRole = 'employee', data, availableWidgets = [] }: DraggableDashboardProps) {
  // Limpiamos initialLayout de duplicados al inicio del estado
  const [items, setItems] = useState<string[]>(Array.from(new Set(initialLayout)));
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // GUARDAR LAYOUT
  const saveLayout = async (newLayout: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_settings').upsert({ 
        user_id: user.id, 
        dashboard_layout: newLayout 
      }, { onConflict: 'user_id' });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveLayout(newOrder); // Guardar cambio
        return newOrder;
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
      setItems(prev => {
          let newLayout;
          if (prev.includes(widgetId)) {
              newLayout = prev.filter(id => id !== widgetId);
          } else {
              newLayout = [...prev, widgetId];
          }
          saveLayout(newLayout);
          return newLayout;
      });
  };

  // Nombres amigables para el menú
  const WIDGET_NAMES: Record<string, string> = {
      revenue_zettle: "Facturación",
      weather: "Clima",
      quick_actions: "Acciones Rápidas",
      agenda_combined: "Agenda del Día",
      staff_status: "Equipo",
      retention_risk: "Watchlist (Clientes)",
      top_breeds: "Top Mascotas"
  };

  return (
    <div className="flex flex-col gap-4">
        {/* BARRA DE HERRAMIENTAS (Solo visible si hay permisos o siempre) */}
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-white border-slate-200 text-slate-600">
                        <Settings2 size={14} /> Personalizar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Widgets Visibles</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(WIDGET_CATALOG).filter(k => !['stats_overview','live_operations'].includes(k)).map((widgetId) => {
                        const isVisible = items.includes(widgetId);
                        // Filtramos por rol si es necesario
                        const widgetDef = WIDGET_CATALOG[widgetId as WidgetId];
                        if (userRole !== 'admin' && !widgetDef.roles.includes('all') && !widgetDef.roles.includes(userRole)) return null;

                        return (
                            <DropdownMenuCheckboxItem 
                                key={widgetId} 
                                checked={isVisible}
                                onCheckedChange={() => toggleWidget(widgetId)}
                            >
                                {WIDGET_NAMES[widgetId] || widgetId}
                            </DropdownMenuCheckboxItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* GRID PRINCIPAL */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
            {items.map((id) => {
                const widgetId = id as WidgetId;
                const widgetDef = WIDGET_CATALOG[widgetId];

                // Si el widget no existe en el catálogo (ej. nombre viejo), no lo renderizamos
                if (!widgetDef) return null;

                const Component = widgetDef.component;
                return (
                <SortableItem key={id} id={id} colSpan={widgetDef.defaultColSpan} onRemove={() => toggleWidget(id)}>
                    <Component data={data} />
                </SortableItem>
                );
            })}
            </div>
        </SortableContext>
        </DndContext>
    </div>
  );
}