'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WIDGET_CATALOG, WidgetId, DashboardData } from './WidgetRegistry';
import { saveDashboardLayout } from '@/app/actions/dashboard-actions';
import { cn } from "@/lib/utils";
import { GripVertical, AlertTriangle } from 'lucide-react';

function SortableItem(props: { id: string; children: React.ReactNode; colSpan: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${props.colSpan} / span ${props.colSpan}`,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1, // Más transparente al arrastrar
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group h-full transition-shadow", isDragging && "ring-2 ring-blue-500 rounded-xl")}>
      <div {...attributes} {...listeners} className="absolute top-3 right-3 z-20 p-1.5 bg-white/80 rounded-md cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200 hover:bg-blue-50">
        <GripVertical size={16} className="text-slate-500" />
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
  // Estado para controlar la hidratación del cliente
  const [isMounted, setIsMounted] = useState(false);
  
  // Lógica de inicialización de items
  const [items, setItems] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // Calcular items solo una vez montado
    const validSavedLayout = initialLayout.filter(id => availableWidgets.includes(id));
    const missingWidgets = availableWidgets.filter(id => !validSavedLayout.includes(id));
    const finalItems = [...validSavedLayout, ...missingWidgets];
    
    // Fallback: Si no hay items, intentar cargar todos los disponibles por defecto
    if (finalItems.length === 0 && availableWidgets.length > 0) {
       setItems(availableWidgets);
    } else {
       setItems(finalItems);
    }
    
    setIsMounted(true);
  }, [initialLayout, availableWidgets]);

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
        saveDashboardLayout(newOrder); // Guardar
        return newOrder;
      });
    }
    setActiveId(null);
  };

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  // SI NO ESTÁ MONTADO AÚN, RENDERIZAR SKELETON O NADA (Evita error visual)
  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[1,2,3,4].map(i => (
             <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
         ))}
      </div>
    );
  }

  // SI NO HAY WIDGETS
  if (items.length === 0) {
      return (
        <div className="col-span-4 py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <AlertTriangle className="h-10 w-10 mb-2 opacity-50"/>
          <p>No hay widgets disponibles para tu rol.</p>
        </div>
      );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-4 md:gap-6 pb-20">
          {items.map((id) => {
            const widgetDef = WIDGET_CATALOG[id as WidgetId];
            if (!widgetDef) {
                console.warn(`Widget ${id} no encontrado en catálogo`);
                return null;
            }
            
            const WidgetComponent = widgetDef.component;

            return (
              <SortableItem key={id} id={id} colSpan={widgetDef.defaultColSpan}>
                <div className="h-full">
                    {/* Pasamos la data completa para que el widget saque lo que necesita */}
                    <WidgetComponent data={data} />
                </div>
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeId ? (
            <div className="opacity-90 scale-105 cursor-grabbing shadow-2xl rounded-xl overflow-hidden bg-white ring-2 ring-blue-500 h-full">
                 <div className="p-4 bg-slate-50 text-slate-500 font-medium text-center h-full flex items-center justify-center">
                    Moviendo Widget...
                 </div>
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}