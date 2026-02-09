'use client'; 

import { useState, useEffect } from 'react';
import StaffGrid from '@/components/staff/StaffGrid'; 
import AddStaffDialog from '@/components/staff/AddStaffDialog'; 
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; 

export default function StaffPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false); 

  const fetchEmployees = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    const supabase = createClient();
    
    // ⚠️ AQUÍ ESTÁ LA CORRECCIÓN: Usamos !fk_staff_...
    const { data, error } = await supabase.from('employees')
      .select(`
        *,
        contracts:employee_contracts!fk_staff_contracts(id, base_salary_weekly, is_active, metadata),
        absences:employee_absences!fk_staff_absences(*),
        documents:employee_documents!fk_staff_documents(*)
      `)
      .order('active', { ascending: false })
      .order('first_name', { ascending: true });
      
    if (error) {
        console.error("Error cargando staff:", error);
        setErrorMsg(error.message); 
    } else {
        setEmployees(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

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
      
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
                <p className="font-bold">Error cargando datos</p>
                <p className="text-sm">{errorMsg}</p>
            </div>
        </div>
      )}

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