'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_CATALOG, WidgetId, DashboardData } from './WidgetRegistry';
import { saveDashboardLayout } from '@/app/actions/dashboard-actions';
import { cn } from "@/lib/utils";
import { GripVertical, AlertCircle } from 'lucide-react';

function SortableItem(props: { id: string; children: React.ReactNode; colSpan: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${props.colSpan} / span ${props.colSpan}`,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={cn("relative group h-full", isDragging && "ring-2 ring-blue-500 rounded-xl")}>
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 rounded-md cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200 hover:bg-blue-50">
        <GripVertical size={14} className="text-slate-500" />
      </div>
      {props.children}
    </div>
  );
}

interface DraggableDashboardProps {
  initialLayout: string[];
  userRole: string;
  data: DashboardData;
}

export default function DraggableDashboard({ initialLayout, userRole, data }: DraggableDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const availableWidgets = Object.keys(WIDGET_CATALOG).filter(key => {
        const w = WIDGET_CATALOG[key as WidgetId];
        if (userRole === 'admin') return true;
        return w.roles.includes('all') || w.roles.includes(userRole);
    });

    const validSaved = initialLayout.filter(id => availableWidgets.includes(id));
    const missing = availableWidgets.filter(id => !validSaved.includes(id));
    const finalItems = [...validSaved, ...missing];
    
    setItems(finalItems.length > 0 ? finalItems : availableWidgets);
    setIsMounted(true);
  }, [initialLayout, userRole]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  if (!isMounted) return <div className="grid grid-cols-1 md:grid-cols-4 gap-6">{[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>)}</div>;

  if (items.length === 0) {
      return (
        <div className="col-span-4 py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30">
          <AlertCircle className="h-10 w-10 mb-2 opacity-50"/>
          <p>No se encontraron widgets para el rol: <span className="font-bold">{userRole}</span></p>
        </div>
      );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={(e) => setActiveId(String(e.active.id))}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {/* CSS KEY: items-start prevents vertical stretching. auto-rows-min lets cards be their natural height. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-min gap-4 md:gap-6 pb-20 items-start">
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
        {activeId ? <div className="opacity-90 scale-105 cursor-grabbing shadow-2xl rounded-xl overflow-hidden bg-white ring-2 ring-blue-500 h-[150px] flex items-center justify-center font-bold text-blue-600">Moviendo...</div> : null}
      </DragOverlay>
    </DndContext>
  );
}