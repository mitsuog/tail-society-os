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
    // ESTRUCTURA PRINCIPAL (Sin scroll global en el body)
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50/30">
        
        {/* 1. HEADER FIJO (Sticky)
            CORRECCIÓN: Bajamos z-index a 10. 
            Esto permite que flote sobre la lista, pero se quede POR DEBAJO del menú hamburger (z-20+).
        */}
        <div className="shrink-0 sticky top-0 z-10 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 transition-all">
            <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    
                    {/* TÍTULO: pl-14 deja espacio para el hamburger en móvil sin taparlo */}
                    <div className="pl-14 md:pl-0 w-full md:w-auto">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="text-slate-600 h-6 w-6" /> Equipo de Trabajo
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1">
                            Administración de perfiles y contratos.
                        </p>
                    </div>

                    {/* BOTONES: También empujados para alinearse visualmente en móvil */}
                    <div className="flex gap-2 w-full md:w-auto pl-14 md:pl-0">
                        <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 text-white flex-1 md:flex-none shadow-sm text-xs md:text-sm h-9 md:h-10">
                            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo
                        </Button>
                        
                        <Link href="/admin/payroll" className="flex-1 md:flex-none">
                            <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 w-full shadow-sm text-xs md:text-sm h-9 md:h-10">
                                <DollarSign className="mr-2 h-4 w-4" /> Nómina
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. ÁREA DE CONTENIDO (Scroll Independiente) */}
        <div className="flex-1 overflow-y-auto w-full scroll-smooth">
            <div className="px-4 md:px-6 py-6 w-full max-w-[1600px] mx-auto pb-32">
                
                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-bold text-sm">Error cargando datos</p>
                            <p className="text-xs">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <Loader2 className="animate-spin h-10 w-10 text-slate-300"/>
                        <p className="text-sm font-medium">Cargando equipo...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
                        <StaffGrid initialEmployees={employees} />
                    </div>
                )}

                <AddStaffDialog isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); handleRefresh(); }} />
            </div>
        </div>
    </div>
  );
}