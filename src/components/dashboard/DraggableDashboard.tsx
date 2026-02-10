'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
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
import { GripVertical, Settings2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { WIDGET_CATALOG, WidgetId, DashboardData } from './WidgetRegistry';

// ============================================================
// TIPOS
// ============================================================
interface DraggableDashboardProps {
  initialLayout: string[];
  userRole?: string;
  data: DashboardData;
  availableWidgets?: string[];
}

// ============================================================
// NOMBRES LEGIBLES PARA EL DROPDOWN
// ============================================================
const WIDGET_NAMES: Record<string, string> = {
  revenue_zettle: '💰 Facturación',
  weather: '🌤️ Clima',
  quick_actions: '⚡ Acciones Rápidas',
  agenda_combined: '📅 Agenda del Día',
  staff_status: '👥 Equipo',
  retention_risk: '⚠️ Watchlist',
  top_breeds: '🐾 Top Razas',
};

// ============================================================
// SORTABLE ITEM
// ============================================================
function SortableItem({ id, children, colSpan = 1 }: {
  id: string;
  children: React.ReactNode;
  colSpan?: number;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as any,
    opacity: isDragging ? 0.85 : 1,
    // NO touchAction: 'none' aquí — bloquea el scroll nativo en móvil
  };

  const colSpanClass = colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1';

  return (
    <div ref={setNodeRef} style={style} className={`${colSpanClass} relative group h-full`}>
      {/* Handle — solo este elemento bloquea touch para drag, NO el widget entero */}
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="absolute top-2.5 right-2.5 z-20 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200/80 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200"
        aria-label="Arrastrar widget"
      >
        <GripVertical size={14} className="text-slate-400" />
      </div>
      {children}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function DraggableDashboard({
  initialLayout,
  userRole = 'employee',
  data
}: DraggableDashboardProps) {

  // Filtrar widgets válidos para el rol del usuario
  const validLayout = initialLayout.filter(id => {
    const widget = WIDGET_CATALOG[id as WidgetId];
    if (!widget) return false;
    const roles = widget.roles as readonly string[];
    return roles.includes('all') || roles.includes(userRole);
  });

  const [items, setItems] = useState<string[]>(Array.from(new Set(validLayout)));
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // ----------------------------------------------------------
  // PERSISTENCIA CON DEBOUNCE
  // Evita ráfagas de escritura en Supabase al arrastrar rápido
  // ----------------------------------------------------------
  const saveLayout = useCallback((newLayout: string[]) => {
    // Cancelar save pendiente
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              dashboard_layout: newLayout,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('[Dashboard] Error guardando layout:', error.message);
        }
      } catch (err) {
        console.error('[Dashboard] Error inesperado al guardar:', err);
      }
    }, 500); // Espera 500ms después del último cambio
  }, [supabase]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ----------------------------------------------------------
  // SENSORES (optimizados para móvil y desktop)
  // ----------------------------------------------------------
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      // 300ms delay + 8px tolerance: scroll funciona normal,
      // solo arrastra si mantienes presionado el handle
      activationConstraint: { delay: 300, tolerance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // ----------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const newOrder = arrayMove(prev, oldIndex, newIndex);
      saveLayout(newOrder);
      return newOrder;
    });
  };

  const toggleWidget = (widgetId: string) => {
    setItems(prev => {
      const newLayout = prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId];
      saveLayout(newLayout);
      return newLayout;
    });
  };

  // ----------------------------------------------------------
  // LISTA DE WIDGETS DISPONIBLES PARA EL ROL
  // ----------------------------------------------------------
  const availableForRole = Object.keys(WIDGET_CATALOG).filter(k => {
    const def = WIDGET_CATALOG[k as WidgetId];
    const roles = def.roles as readonly string[];
    return roles.includes('all') || roles.includes(userRole) || userRole === 'admin';
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Botón de personalización */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              <Settings2 size={14} /> Personalizar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-slate-500">Widgets Disponibles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableForRole.map((widgetId) => (
              <DropdownMenuCheckboxItem
                key={widgetId}
                checked={items.includes(widgetId)}
                onCheckedChange={() => toggleWidget(widgetId)}
              >
                {WIDGET_NAMES[widgetId] || widgetId}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid de widgets */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 pb-20 md:pb-10">
            {items.map((id) => {
              const widgetDef = WIDGET_CATALOG[id as WidgetId];
              if (!widgetDef) return null;
              const Component = widgetDef.component;
              return (
                <SortableItem key={id} id={id} colSpan={widgetDef.defaultColSpan}>
                  <Component data={data} />
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Estado vacío */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-slate-100 p-4 rounded-full mb-4">
            <Settings2 size={24} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Tu dashboard está vacío</p>
          <p className="text-xs text-slate-400 mt-1">Usa el botón "Personalizar" para agregar widgets</p>
        </div>
      )}
    </div>
  );
}