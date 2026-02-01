'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, Dog, Phone, Mail, MapPin, X, ExternalLink, Calendar, 
  CalendarClock, PhoneOutgoing, FileText, PlusCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientRowProps {
  client: any;
  lastVisitDate: Date | null;
  firstVisitDate: Date | null;
}

export default function ClientRow({ client, lastVisitDate }: ClientRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleEsc = (e: KeyboardEvent) => { if(e.key === 'Escape') setIsOpen(false) };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getActionStatus = () => {
    if (!lastVisitDate) return null;
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 60) return { label: 'Recuperar', subText: `hace ${diffDays}d`, color: 'text-rose-700 bg-rose-50 border-rose-200', icon: PhoneOutgoing, priority: 'high' };
    if (diffDays > 30) return { label: 'Sugerir Cita', subText: `hace ${diffDays}d`, color: 'text-amber-700 bg-amber-50 border-amber-200', icon: CalendarClock, priority: 'medium' };
    return { label: 'Al día', color: 'text-slate-400', priority: 'low' };
  };

  const status = getActionStatus();
  const StatusIcon = status?.icon;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsOpen(false);
  };

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer transition-colors group border-b border-slate-100 hover:bg-slate-50", isOpen && "bg-blue-50/60")}
        onClick={() => setIsOpen(true)}
      >
        <TableCell className="py-4 align-top">
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{client.full_name}</span>
            <span className="text-slate-500 text-sm flex items-center gap-1"><Phone size={12}/>{client.phone}</span>
          </div>
        </TableCell>
        
        {/* COLUMNA MASCOTAS */}
        <TableCell className="py-4 align-top hidden sm:table-cell">
          <div className="flex flex-wrap gap-2 relative">
            {client.pets?.length > 0 ? client.pets.map((pet: any) => (
              <DropdownMenu key={pet.id}>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Button variant="secondary" className="h-6 px-2.5 text-xs font-normal bg-white border border-slate-200 text-slate-600 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-colors shadow-sm group-hover/badge:border-blue-300">
                    {pet.name} <ChevronRight size={10} className="ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="start" sideOffset={5} className="w-56 z-[200] bg-white shadow-xl border-slate-200">
                  <DropdownMenuLabel className="flex items-center gap-2 bg-slate-50/50 py-2">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Dog size={14} /></div>
                    <div className="flex flex-col"><span className="text-sm font-bold text-slate-700 leading-none">{pet.name}</span><span className="text-[10px] font-normal text-slate-400 leading-none mt-0.5">{pet.species}</span></div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* ACCIÓN DE AGENDAR - Enlace Corregido */}
                  <Link href={`/appointments/new?client_id=${client.id}&pet_id=${pet.id}`} onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 focus:bg-blue-50 focus:text-blue-700">
                      <PlusCircle size={16} className="text-green-600" />
                      <span className="font-medium">Agendar Cita</span>
                    </DropdownMenuItem>
                  </Link>

                  {/* ACCIÓN DE BITÁCORA */}
                  <Link href={`/clients/${client.id}?tab=bitacora&pet_id=${pet.id}`} onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 focus:bg-slate-100">
                      <FileText size={16} className="text-slate-500" />
                      <span>Ver Bitácora</span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            )) : <span className="text-slate-400 italic text-xs">Sin mascotas</span>}
          </div>
        </TableCell>
        
        <TableCell className="py-4 align-top hidden md:table-cell text-slate-600 text-sm">
           <div className="flex flex-col items-start gap-1.5">
             <div className="flex items-center gap-2 text-slate-500"><Calendar size={14} className="text-slate-400"/> {lastVisitDate ? lastVisitDate.toLocaleDateString('es-MX', {day: 'numeric', month: 'short'}) : "-"}</div>
             {status && status.priority !== 'low' && <div className={cn("text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1.5 font-semibold w-fit shadow-sm", status.color)}>{StatusIcon && <StatusIcon size={12} strokeWidth={2.5} />}<span>{status.label}</span></div>}
           </div>
        </TableCell>
        <TableCell className="py-4 align-top text-right"><Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">Ver <ChevronRight size={16}/></Button></TableCell>
      </TableRow>

      {/* PANEL LATERAL (Sin cambios funcionales, solo estilo) */}
      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end pointer-events-auto">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleClose} />
          <div className="relative h-full w-full sm:w-[400px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div><h2 className="text-xl font-bold text-slate-900">{client.full_name}</h2><p className="text-sm text-slate-500 mt-1 flex items-center gap-2"><Phone size={14}/> {client.phone}</p>
                {status && status.priority !== 'low' && <div className={cn("mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border", status.color)}>{StatusIcon && <StatusIcon size={14}/>}<span>Sugerencia: {status.label} ({status.subText})</span></div>}
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-full border shadow-sm transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contacto</h3><div className="bg-white border rounded-lg p-3 space-y-2 text-sm shadow-sm"><div className="flex gap-2"><Mail size={16} className="text-slate-400"/> <span>{client.email || "Sin email"}</span></div><div className="flex gap-2"><MapPin size={16} className="text-slate-400"/> <span>{client.address || "Sin dirección"}</span></div></div></div>
              <div className="space-y-3"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mascotas ({client.pets?.length || 0})</h3><div className="space-y-2">{client.pets?.map((pet: any) => (<div key={pet.id} className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100"><div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm"><Dog size={18}/></div><div><p className="font-bold text-slate-800 text-sm">{pet.name}</p><p className="text-xs text-slate-500">{pet.breed} • {pet.species}</p></div></div>))}</div></div>
              {client.notes && (<div className="space-y-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notas Internas</h3><div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-slate-700 leading-relaxed">{client.notes}</div></div>)}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50"><Link href={`/clients/${client.id}`}><Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white"><ExternalLink size={16} /> Ver Perfil Completo y Editar</Button></Link></div>
          </div>
        </div>, document.body
      )}
    </>
  );
}