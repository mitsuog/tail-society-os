'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_CATALOG, WidgetId, DashboardData } from './WidgetRegistry';
import { saveDashboardLayout } from '@/app/actions/dashboard-actions';
import { cn } from "@/lib/utils";
import { GripVertical } from 'lucide-react';

function SortableItem(props: { id: string; children: React.ReactNode; colSpan: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${props.colSpan} / span ${props.colSpan}`,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group h-full", isDragging && "scale-105")}>
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 rounded-md cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200 backdrop-blur-sm hover:bg-blue-50">
        <GripVertical size={14} className="text-slate-500" />
      </div>
      {props.children}
    </div>
  );
}

interface DraggableDashboardProps {
  initialLayout: string[];
  availableWidgets: string[];
  data: DashboardData;
}

export default function DraggableDashboard({ initialLayout, availableWidgets, data }: DraggableDashboardProps) {
  // Combinar lo guardado con lo nuevo disponible, filtrando lo que ya no está permitido
  const validSavedLayout = initialLayout.filter(id => availableWidgets.includes(id));
  const missingWidgets = availableWidgets.filter(id => !validSavedLayout.includes(id));
  
  const [items, setItems] = useState<string[]>([...validSavedLayout, ...missingWidgets]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveDashboardLayout(newOrder);
        return newOrder;
      });
    }
    setActiveId(null);
  };

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  if (items.length === 0) {
      return (
        <div className="col-span-4 py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <p>No tienes widgets asignados.</p>
        </div>
      );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-4 md:gap-6 pb-20">
          {items.map((id) => {
            const widgetDef = WIDGET_CATALOG[id as WidgetId];
            if (!widgetDef) return null;
            const WidgetComponent = widgetDef.component;
            return (
              <SortableItem key={id} id={id} colSpan={widgetDef.defaultColSpan}>
                <WidgetComponent data={data} />
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
            <div className="opacity-90 scale-105 cursor-grabbing shadow-2xl rounded-xl overflow-hidden bg-white border-2 border-blue-500">
                 <div className="p-4 bg-blue-50 text-blue-700 font-bold text-center">Moviendo...</div>
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}