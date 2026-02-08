import { createClient } from '@/utils/supabase/server';
import StaffGrid from './StaffGrid'; 
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DollarSign, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const supabase = await createClient();
  
  // Obtenemos los empleados ordenados
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .order('active', { ascending: false })
    .order('first_name', { ascending: true });

  return (
    <div className="p-6 space-y-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Encabezado Mejorado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-slate-600" /> 
            Equipo de Trabajo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona perfiles, horarios y contratos. 
            <span className="text-orange-600 font-medium ml-1">
               *Desactivar un empleado ocultará su columna en el calendario.
            </span>
          </p>
        </div>

        {/* Botón para ir al Módulo de Nómina */}
        <Link href="/admin/payroll">
          <Button className="bg-green-700 hover:bg-green-800 text-white shadow-sm transition-all">
            <DollarSign className="mr-2 h-4 w-4" />
            Ir a Nómina y Pagos
          </Button>
        </Link>
      </div>
      
      {/* Renderizamos el Grid Interactivo */}
      {/* Nota: StaffGrid usará el nuevo StaffDialog que actualizamos antes */}
      <StaffGrid initialEmployees={employees || []} />
    </div>
  );
}