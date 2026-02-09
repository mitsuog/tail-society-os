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
    
    // Consulta optimizada
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
    // ESTRUCTURA PRINCIPAL: Flex Columna sin scroll global
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50/30">
        
        {/* 1. HEADER FIJO (Fuera del scroll) */}
        <div className="w-full shrink-0 bg-slate-50/30 z-10">
            <div className="max-w-[1600px] mx-auto px-4 md:px-6 pt-6 pb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4 bg-transparent">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="text-slate-600 h-6 w-6" /> Equipo de Trabajo
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Administración de perfiles, contratos y expediente digital.
                        </p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 text-white flex-1 md:flex-none shadow-sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Empleado
                        </Button>
                        
                        <Link href="/admin/payroll" className="flex-1 md:flex-none">
                            <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 w-full shadow-sm">
                                <DollarSign className="mr-2 h-4 w-4" /> Nómina
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. ÁREA DE CONTENIDO (Scrollable) */}
        <div className="flex-1 overflow-y-auto w-full">
            <div className="px-4 md:px-6 py-4 w-full max-w-[1600px] mx-auto pb-24">
                
                {/* Mensaje de Error */}
                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 mb-6">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-bold">Error cargando datos</p>
                            <p className="text-sm">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* Grid de Empleados */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-slate-300"/></div>
                ) : (
                    <StaffGrid initialEmployees={employees} />
                )}

                {/* MODAL CREAR */}
                <AddStaffDialog isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); handleRefresh(); }} />
            </div>
        </div>
    </div>
  );
}