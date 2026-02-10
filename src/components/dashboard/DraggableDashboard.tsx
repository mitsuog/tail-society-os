'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  MouseSensor,
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
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WIDGET_CATALOG, WidgetId, DashboardData } from './WidgetRegistry';

interface DraggableDashboardProps {
  initialLayout: string[];
  userRole?: string;
  data: DashboardData;
  availableWidgets?: string[];
}

function SortableItem({ id, children, colSpan = 1, onRemove }: { id: string; children: React.ReactNode; colSpan?: number, onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.8 : 1, touchAction: 'none' };
  const colSpanClass = colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1';

  return (
    <div ref={setNodeRef} style={style} className={`${colSpanClass} relative group h-full select-none`}>
      {/* Botón de agarre visible en escritorio o siempre para mayor claridad */}
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 touch-manipulation transition-opacity">
        <GripVertical size={16} className="text-slate-500" />
      </div>
      {children}
    </div>
  );
}

export default function DraggableDashboard({ initialLayout, userRole = 'employee', data }: DraggableDashboardProps) {
  // Filtrado de roles
  const validLayout = initialLayout.filter(id => {
      const widget = WIDGET_CATALOG[id as WidgetId];
      if (!widget) return false;
      if (widget.roles.includes('all')) return true;
      if (widget.roles.includes(userRole)) return true;
      return false;
  });

  const [items, setItems] = useState<string[]>(Array.from(new Set(validLayout)));
  const supabase = createClient();

  // SENSORES OPTIMIZADOS PARA MOVIL
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { 
        // Para móvil: Presionar 250ms para empezar a arrastrar, permite scroll si es rápido
        activationConstraint: { delay: 250, tolerance: 5 } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveLayout = async (newLayout: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('user_settings').upsert({ user_id: user.id, dashboard_layout: newLayout }, { onConflict: 'user_id' });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveLayout(newOrder);
        return newOrder;
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
      setItems(prev => {
          let newLayout;
          if (prev.includes(widgetId)) newLayout = prev.filter(id => id !== widgetId);
          else newLayout = [...prev, widgetId];
          saveLayout(newLayout);
          return newLayout;
      });
  };

  const WIDGET_NAMES: Record<string, string> = {
      revenue_zettle: "Facturación",
      weather: "Clima",
      quick_actions: "Acciones Rápidas",
      agenda_combined: "Agenda del Día",
      staff_status: "Equipo",
      retention_risk: "Watchlist",
      top_breeds: "Top Mascotas"
  };

  return (
    <div className="flex flex-col gap-4">
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-white border-slate-200 text-slate-600">
                        <Settings2 size={14} /> Personalizar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Widgets Disponibles</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(WIDGET_CATALOG).filter(k => !['stats_overview','live_operations'].includes(k)).map((widgetId) => {
                            const widgetDef = WIDGET_CATALOG[widgetId as WidgetId];
                            if (userRole !== 'admin' && !widgetDef.roles.includes('all') && !widgetDef.roles.includes(userRole)) return null;
                            return (
                                <DropdownMenuCheckboxItem key={widgetId} checked={items.includes(widgetId)} onCheckedChange={() => toggleWidget(widgetId)}>
                                    {WIDGET_NAMES[widgetId] || widgetId}
                                </DropdownMenuCheckboxItem>
                            );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
            {items.map((id) => {
                const widgetDef = WIDGET_CATALOG[id as WidgetId];
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