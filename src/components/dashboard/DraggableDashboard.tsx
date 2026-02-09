'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_CATALOG, WidgetId } from './WidgetRegistry';
import { saveDashboardLayout } from '@/app/actions/dashboard-actions';
import { cn } from "@/lib/utils";
import { GripVertical } from 'lucide-react';

// --- COMPONENTE ORDENABLE INDIVIDUAL ---
function SortableItem(props: { id: string; children: React.ReactNode; colSpan: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${props.colSpan} / span ${props.colSpan}`, // Tailwind col-span dinámico
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group h-full", isDragging && "scale-105")}>
      {/* Handle para arrastrar (solo aparece en hover) */}
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-20 p-1 bg-white/80 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-sm">
        <GripVertical size={16} className="text-slate-400" />
      </div>
      {props.children}
    </div>
  );
}

interface DraggableDashboardProps {
  initialLayout: string[];
  availableWidgets: string[]; // IDs permitidos por rol
  data: any; // Datos reales (ingresos, citas, etc)
}

export default function DraggableDashboard({ initialLayout, availableWidgets, data }: DraggableDashboardProps) {
  // Filtrar layout guardado para asegurar que solo tenga widgets permitidos (por si cambió de rol)
  const validSavedLayout = initialLayout.filter(id => availableWidgets.includes(id));
  
  // Agregar widgets nuevos que no estén en el layout guardado (nuevas features)
  const missingWidgets = availableWidgets.filter(id => !validSavedLayout.includes(id));
  
  const [items, setItems] = useState<string[]>([...validSavedLayout, ...missingWidgets]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Guardar en DB (Optimistic update)
        saveDashboardLayout(newOrder);
        
        return newOrder;
      });
    }
    setActiveId(null);
  };

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
          {items.map((id) => {
            const widgetDef = WIDGET_CATALOG[id as WidgetId];
            if (!widgetDef) return null;
            
            // Renderizar el componente del catálogo pasándole la data
            const WidgetComponent = widgetDef.component;

            return (
              <SortableItem key={id} id={id} colSpan={widgetDef.defaultColSpan}>
                <WidgetComponent data={data} />
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
      
      {/* Overlay para que se vea bonito mientras arrastras */}
      <DragOverlay>
        {activeId ? (
            <div className="bg-white/90 p-4 rounded-xl border border-blue-500 shadow-xl opacity-90 scale-105 cursor-grabbing">
                Arrastrando widget...
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}