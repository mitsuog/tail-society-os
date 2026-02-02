import { createClient } from '@/utils/supabase/server';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StaffDialog from '@/components/StaffDialog';
import { Clock, UserCog, Scissors, Droplets, Wind } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: employees } = await supabase.from('employees').select('*').order('created_at');

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'stylist': return <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1"><Scissors size={10}/> Estilista</Badge>;
      case 'finisher': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Wind size={10}/> Terminador</Badge>;
      case 'bather': return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 gap-1"><Droplets size={10}/> Bañador</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo de Trabajo</h1>
          <p className="text-slate-500">Gestiona roles para los carriles de la agenda.</p>
        </div>
        <StaffDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {employees?.map((emp) => (
          <Card key={emp.id} className="overflow-hidden border-t-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTopColor: emp.color }}>
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <Avatar className="h-12 w-12 border border-slate-100 bg-slate-50 text-slate-500">
                <AvatarImage src={emp.avatar_url} />
                <AvatarFallback className="font-bold">{emp.first_name[0]}{emp.last_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate" title={`${emp.first_name} ${emp.last_name}`}>
                    {emp.first_name} {emp.last_name}
                </CardTitle>
                <div className="mt-1">{getRoleBadge(emp.role)}</div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 space-y-3 pt-0">
               <div className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                 <Clock size={14} className="text-slate-400" />
                 <span>10:00 AM - 06:30 PM</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="flex items-center gap-1.5"><UserCog size={14}/> Estatus:</span>
                 <span className={emp.active ? "text-green-600 font-medium" : "text-slate-400"}>
                    {emp.active ? "Activo" : "Inactivo"}
                 </span>
               </div>
            </CardContent>
          </Card>
        ))}
        
        {(!employees || employees.length === 0) && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <UserCog size={48} className="mx-auto mb-3 opacity-20"/>
            <p className="font-medium">No hay empleados registrados.</p>
            <p className="text-sm opacity-70">Agrega al equipo para comenzar a agendar.</p>
          </div>
        )}
      </div>
    </div>
  );
}