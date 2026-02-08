'use client'; // Convertimos a Client Component para manejar el estado del modal "Nuevo"

import { useState, useEffect } from 'react';
import StaffGrid from '@/components/staff/StaffGrid'; 
import AddStaffDialog from '@/components/staff/AddStaffDialog'; // Importar
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, PlusCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; // Cliente para fetch en useEffect

export default function StaffPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false); // Estado modal nuevo

  // Fetch data on client side to keep it simple with the modals revalidation
  const fetchEmployees = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('employees')
      .select(`
        *,
        contracts:employee_contracts(id, base_salary_weekly, is_active, metadata),
        absences:employee_absences(*),
        documents:employee_documents(*)
      `)
      .order('active', { ascending: false })
      .order('first_name', { ascending: true });
      
    if(data) setEmployees(data);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  // Recargar al cerrar modales si es necesario
  const handleRefresh = () => { fetchEmployees(); };

  return (
    <div className="p-6 space-y-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-slate-600" /> Equipo de Trabajo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración de perfiles, contratos y expediente digital.
          </p>
        </div>

        <div className="flex gap-2">
            <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 text-white">
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Empleado
            </Button>
            
            <Link href="/admin/payroll">
            <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                <DollarSign className="mr-2 h-4 w-4" /> Ir a Nómina
            </Button>
            </Link>
        </div>
      </div>
      
      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-slate-300"/></div>
      ) : (
         <StaffGrid initialEmployees={employees} />
      )}

      {/* MODAL CREAR */}
      <AddStaffDialog isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); handleRefresh(); }} />
    </div>
  );
}