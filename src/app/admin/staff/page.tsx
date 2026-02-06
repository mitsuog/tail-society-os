import { createClient } from '@/utils/supabase/server';
// IMPORTANTE: Importamos desde './StaffGrid' porque está en la misma carpeta
import StaffGrid from './StaffGrid'; 

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const supabase = await createClient();
  
  // Obtenemos los empleados ordenados: Primero los activos, luego por nombre
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .order('active', { ascending: false })
    .order('first_name', { ascending: true });

  return (
    
    <div className="p-6 space-y-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Encabezado de la página */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo de Trabajo</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona a tus estilistas y personal. 
            <span className="text-orange-600 font-medium ml-1">
               *Desactivar un empleado ocultará su columna en el calendario.
            </span>
          </p>
        </div>
      </div>
      
      {/* Renderizamos el Grid Interactivo (Cliente) */}
      <StaffGrid initialEmployees={employees || []} />
    </div>
  );
}