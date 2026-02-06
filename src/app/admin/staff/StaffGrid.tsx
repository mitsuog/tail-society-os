'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, UserCog, Scissors, Droplets, Wind, MoreVertical, Pencil, Power, User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Asegúrate de que StaffDialog esté actualizado con la interfaz correcta en /components
import StaffDialog from '@/components/StaffDialog'; 

export default function StaffGrid({ initialEmployees }: { initialEmployees: any[] }) {
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Abrir modal en modo "Editar"
  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  // Abrir modal en modo "Crear"
  const handleCreate = () => {
    setSelectedEmployee(null); 
    setIsDialogOpen(true);
  };

  // Lógica para activar/desactivar sin abrir modal
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
        .from('employees')
        .update({ active: !currentStatus })
        .eq('id', id);
    
    if (error) {
        toast.error("Error al actualizar estatus");
    } else {
        toast.success(currentStatus ? "Empleado desactivado" : "Empleado activado");
        router.refresh(); // Refresca los datos en pantalla
    }
  };

  // Helper para mostrar badges bonitos según el rol
  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'stylist': return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 gap-1"><Scissors size={10}/> Estilista</Badge>;
      case 'finisher': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Wind size={10}/> Terminador</Badge>;
      case 'bather': return <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 border-cyan-200 gap-1"><Droplets size={10}/> Bañador</Badge>;
      case 'reception': return <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-slate-200 gap-1"><User size={10}/> Recepción</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <>
      {/* Botón de Acción Principal */}
      <div className="flex justify-end mb-6">
         <Button onClick={handleCreate} className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
            <UserCog className="mr-2 h-4 w-4" /> Nuevo Miembro
         </Button>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {initialEmployees.map((emp) => (
          <Card 
            key={emp.id} 
            className={`overflow-hidden transition-all hover:shadow-md border-slate-200 ${!emp.active ? 'opacity-60 bg-slate-50' : 'bg-white'}`}
          >
            <CardHeader className="flex flex-row items-start gap-4 pb-3 relative">
                {/* Menú de Opciones (3 puntos) */}
                <div className="absolute top-3 right-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                                <MoreVertical size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(emp)}>
                                <Pencil size={14} className="mr-2"/> Editar Datos
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => handleToggleStatus(emp.id, emp.active)} 
                                className={emp.active ? "text-red-600 focus:text-red-600 focus:bg-red-50" : "text-green-600 focus:text-green-600 focus:bg-green-50"}
                            >
                                <Power size={14} className="mr-2"/> {emp.active ? "Desactivar" : "Reactivar"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Avatar con indicador de color */}
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={emp.avatar_url} />
                        <AvatarFallback className="bg-slate-200 text-slate-500 font-bold">
                            {emp.first_name[0]}{emp.last_name ? emp.last_name[0] : ''}
                        </AvatarFallback>
                    </Avatar>
                    {/* Puntito de color asignado */}
                    <div 
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                        style={{ backgroundColor: emp.color || '#cbd5e1' }}
                        title="Color en calendario"
                    ></div>
                </div>

                <div className="flex flex-col overflow-hidden">
                    <CardTitle className="text-sm font-bold text-slate-900 uppercase truncate pr-6" title={`${emp.first_name} ${emp.last_name}`}>
                        {emp.first_name} {emp.last_name}
                    </CardTitle>
                    <div className="mt-1">{getRoleBadge(emp.role)}</div>
                </div>
            </CardHeader>
            
            <CardContent className="text-xs text-slate-500 space-y-3 pt-0">
               <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                 <Clock size={14} className="text-slate-400" />
                 <span>10:00 AM - 06:30 PM</span>
               </div>
               
               <div className="flex items-center justify-between pt-1">
                 <span className="flex items-center gap-1.5"><UserCog size={14}/> Estatus:</span>
                 <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${emp.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {emp.active ? "Activo" : "Inactivo"}
                 </span>
               </div>
            </CardContent>
          </Card>
        ))}
        
        {(!initialEmployees || initialEmployees.length === 0) && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <UserCog size={48} className="mx-auto mb-3 opacity-20" />
            <p>No hay personal registrado</p>
            <Button variant="link" onClick={handleCreate}>Agregar el primero</Button>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN/CREACIÓN */}
      <StaffDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        employeeToEdit={selectedEmployee} 
        onSuccess={() => {
            setIsDialogOpen(false);
            router.refresh();
        }}
      />
    </>
  );
}