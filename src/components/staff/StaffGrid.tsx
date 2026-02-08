'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    MoreHorizontal, 
    Phone, 
    Mail, 
    MapPin, 
    DollarSign, 
    CalendarCheck, 
    Briefcase, 
    UserCog,
    AlertCircle,
    Power,
    EyeOff
} from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleEmployeeStatus } from '@/app/actions/staff-actions';

// Importamos los modales
import StaffFinancialsDialog from './StaffFinancialsDialog';
import StaffProfileDialog from './StaffProfileDialog';

export default function StaffGrid({ initialEmployees }: { initialEmployees: any[] }) {
  
  // Estado para Modales
  const [selectedFinEmployee, setSelectedFinEmployee] = useState<any>(null);
  const [isFinOpen, setIsFinOpen] = useState(false);

  const [selectedProfEmployee, setSelectedProfEmployee] = useState<any>(null);
  const [isProfOpen, setIsProfOpen] = useState(false);

  // Handlers para abrir modales
  const handleOpenFinancials = (emp: any) => {
    setSelectedFinEmployee(emp);
    setIsFinOpen(true);
  };

  const handleOpenProfile = (emp: any) => {
    setSelectedProfEmployee(emp);
    setIsProfOpen(true);
  };

  const handleToggleStatus = async (emp: any) => {
      const action = emp.active ? 'desactivar' : 'reactivar';
      if(!confirm(`¿Estás seguro de que quieres ${action} a ${emp.first_name}?`)) return;
      try {
          await toggleEmployeeStatus(emp.id, emp.active);
          toast.success(`Empleado ${emp.active ? 'desactivado' : 'reactivado'}`);
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  // 🛡️ GUARDIA: Estado vacío
  if (!initialEmployees || initialEmployees.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
            <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                <UserCog className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No hay personal registrado</h3>
            <p className="text-slate-500 max-w-sm mt-1">
                Comienza agregando colaboradores para gestionar sus expedientes y nómina.
            </p>
        </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {initialEmployees.map((employee) => {
            // Protección de datos
            const contract = employee.contracts && employee.contracts.length > 0 
                ? employee.contracts.find((c: any) => c.is_active) 
                : null;
            
            const avatarColor = employee.color || '#64748b';
            const isActive = employee.active;

            return (
                <Card key={employee.id} className={`group transition-all hover:shadow-lg border-slate-200 ${!isActive ? 'opacity-75 bg-slate-50 grayscale' : 'bg-white'}`}>
                    
                    {/* HEADER DE LA TARJETA */}
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 border-b border-slate-100/50">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-lg ring-2 ring-white relative"
                                style={{ backgroundColor: isActive ? avatarColor : '#94a3b8' }}
                            >
                                {employee.first_name ? employee.first_name.charAt(0).toUpperCase() : '?'}
                                {/* Indicador si está oculto de la agenda pero activo */}
                                {!employee.show_in_calendar && isActive && (
                                    <span title="No visible en agenda" className="absolute -bottom-1 -right-1 bg-slate-800 text-white rounded-full p-0.5 border-2 border-white">
                                        <EyeOff size={10} />
                                    </span>
                                )}
                            </div>
                            
                            {/* Info Principal */}
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                                    {employee.first_name} {employee.last_name}
                                    {!isActive && <Badge variant="destructive" className="text-[10px] h-4 px-1">Inactivo</Badge>}
                                </CardTitle>
                                <div className="flex items-center gap-1 mt-1">
                                    <Briefcase className="w-3 h-3 text-slate-400" />
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                        {employee.role || 'Sin puesto'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Menú de Acciones */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenProfile(employee)}>
                                    <UserCog className="mr-2 h-4 w-4" /> Ver Perfil Completo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenFinancials(employee)}>
                                    <DollarSign className="mr-2 h-4 w-4" /> Contrato y Pagos
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => handleToggleStatus(employee)}
                                    className={isActive ? "text-red-600 focus:text-red-600" : "text-green-600 focus:text-green-600"}
                                >
                                    <Power className="mr-2 h-4 w-4" /> 
                                    {isActive ? 'Desactivar Empleado' : 'Reactivar Empleado'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    
                    {/* CONTENIDO */}
                    <CardContent className="space-y-4 pt-4">
                        
                        {/* 1. Datos de Contacto */}
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center text-slate-600">
                                <Phone className="mr-2 h-3.5 w-3.5 text-slate-400" /> 
                                <span className="truncate">{employee.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center text-slate-600">
                                <Mail className="mr-2 h-3.5 w-3.5 text-slate-400" /> 
                                <span className="truncate text-xs">{employee.email || 'Sin email'}</span>
                            </div>
                        </div>

                        {/* 2. Resumen Financiero */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-slate-200">
                             <Badge variant="secondary" className="font-normal bg-slate-100 text-slate-700">
                                <DollarSign className="w-3 h-3 mr-1 text-slate-500"/> 
                                Base: <span className="font-semibold ml-1">{contract ? `$${contract.base_salary_weekly}` : '$0'}</span>
                             </Badge>

                             <Badge 
                                variant="outline" 
                                className={`font-normal border-opacity-50 ${
                                    employee.commission_type === 'grooming' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}
                             >
                                <CalendarCheck className="w-3 h-3 mr-1 opacity-70"/> 
                                {employee.participation_pct}% {employee.commission_type === 'grooming' ? 'Grooming' : 'Tienda'}
                             </Badge>
                        </div>
                        
                        {/* Botones */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8"
                                onClick={() => handleOpenProfile(employee)}
                             >
                                Ver Detalles
                             </Button>
                             <Button 
                                variant="secondary" 
                                size="sm" 
                                className="text-xs h-8 bg-slate-800 text-white hover:bg-slate-700 shadow-sm"
                                onClick={() => handleOpenFinancials(employee)}
                             >
                                Finanzas
                             </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        })}
      </div>

      {/* --- MODALES --- */}

      {/* 1. Modal Financiero */}
      {selectedFinEmployee && (
        <StaffFinancialsDialog 
            isOpen={isFinOpen} 
            onClose={() => { setIsFinOpen(false); setSelectedFinEmployee(null); }}
            employee={selectedFinEmployee}
        />
      )}

      {/* 2. Modal de Perfil Completo (Expediente, Asistencia, etc) */}
      {selectedProfEmployee && (
        <StaffProfileDialog 
            isOpen={isProfOpen}
            onClose={() => { setIsProfOpen(false); setSelectedProfEmployee(null); }}
            employee={selectedProfEmployee}
        />
      )}

    </>
  );
}