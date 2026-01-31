'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronRight, Phone, Mail, MapPin, 
  Dog, Cat, History, ArrowRight, 
  AlertTriangle, ShieldCheck, Star, Calendar 
} from 'lucide-react';

interface ClientRowProps {
  client: any;
  lastVisitDate: Date | null;
  firstVisitDate: Date | null; // Nueva prop
}

export default function ClientRow({ client, lastVisitDate, firstVisitDate }: ClientRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  // CÁLCULO DE LEALTAD
  const totalVisits = client.pets.reduce((acc: number, pet: any) => {
    return acc + (pet.appointments?.length || 0);
  }, 0);

  const isVip = totalVisits >= 10;
  const isNew = totalVisits === 0;

  // Lógica para mostrar "Cliente Desde":
  // Si tiene primera cita, usamos esa. Si no, usamos la fecha de registro en BD.
  const customerSinceDate = firstVisitDate || new Date(client.created_at);
  const customerSinceYear = customerSinceDate.getFullYear();
  // Formateamos la fecha bonita (ej: "12 Ene 2024")
  const customerSinceString = customerSinceDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <TableRow 
        className="hover:bg-blue-50/50 cursor-pointer group transition-colors border-b border-slate-50 last:border-0"
        onClick={() => setIsOpen(true)}
      >
        <TableCell className="py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm bg-slate-100">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.full_name}&backgroundColor=e2e8f0`} />
              <AvatarFallback className="text-slate-500 font-bold">{client.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                {client.full_name}
              </div>
              <div className="text-xs font-medium flex items-center gap-1.5 mt-0.5">
                 {lastVisitDate ? (
                   <>
                     <History size={12} className="text-orange-500"/>
                     <span className="text-orange-700">
                       Visita: {lastVisitDate.toLocaleDateString()}
                     </span>
                   </>
                 ) : (
                   <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                     Nuevo Cliente
                   </span>
                 )}
              </div>
            </div>
          </div>
        </TableCell>
        
        <TableCell className="hidden md:table-cell">
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Phone size={14} className="text-blue-500" /> {client.phone}
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail size={14} className="text-slate-400" /> {client.email}
              </div>
            )}
          </div>
        </TableCell>

        <TableCell>
          <div className="flex flex-wrap gap-2">
            {client.pets.map((pet: any, idx: number) => {
              const isCat = pet.species && pet.species.toLowerCase().includes('gato');
              const hasAlerts = pet.allergies || pet.behavior_notes;
              
              return (
                <Badge key={idx} variant="secondary" className={`bg-white border border-slate-200 text-slate-600 shadow-sm px-2 py-1 ${isCat ? 'hover:border-purple-300 hover:bg-purple-50' : 'hover:border-blue-300 hover:bg-blue-50'}`}>
                  {hasAlerts && <AlertTriangle size={12} className="mr-1 text-red-500" />}
                  {!hasAlerts && (isCat ? <Cat size={12} className="mr-1.5 text-purple-400"/> : <Dog size={12} className="mr-1.5 text-blue-400"/>)}
                  {pet.name}
                </Badge>
              );
            })}
          </div>
        </TableCell>

        <TableCell className="text-right">
          <Button variant="ghost" size="sm" className="text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md w-full">
          <SheetHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col items-center text-center space-y-3 pt-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.full_name}&backgroundColor=e2e8f0`} />
                  <AvatarFallback className="text-2xl">{client.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {isVip && (
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> VIP
                  </div>
                )}
                {isNew && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                    NUEVO
                  </div>
                )}
              </div>
              
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">{client.full_name}</SheetTitle>
                <SheetDescription className="flex items-center justify-center gap-2 mt-1">
                  <ShieldCheck size={14} className="text-green-600"/>
                  {/* AQUÍ MOSTRAMOS LA FECHA REAL */}
                  Cliente desde: <span className="font-medium text-slate-700">{customerSinceString}</span>
                </SheetDescription>
              </div>

              <div className="grid grid-cols-2 w-full gap-4 mt-2">
                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-xs text-slate-400 font-bold uppercase">Visitas Totales</span>
                    <span className="block text-lg font-bold text-slate-700">{totalVisits}</span>
                 </div>
                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-xs text-slate-400 font-bold uppercase">Última Visita</span>
                    <span className={`block text-sm font-bold mt-1 ${lastVisitDate ? 'text-slate-700' : 'text-slate-300'}`}>
                      {lastVisitDate ? lastVisitDate.toLocaleDateString() : '—'}
                    </span>
                 </div>
              </div>
            </div>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Phone size={14}/> Contacto
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-md">
                  <span className="text-slate-500">Móvil</span>
                  <a href={`tel:${client.phone}`} className="font-medium text-blue-600 hover:underline">{client.phone}</a>
                </div>
                {client.email && (
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-md">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium text-slate-900 truncate max-w-[200px]">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="p-3 bg-white border border-slate-200 rounded-md">
                    <span className="block text-xs text-slate-400 mb-1">Dirección</span>
                    <span className="font-medium text-slate-900 text-xs">{client.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Dog size={14}/> Mascotas
              </h4>
              <div className="grid gap-3">
                {client.pets.map((pet: any) => (
                  <div key={pet.id} className="relative p-3 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${pet.species?.includes('Gato') ? 'bg-purple-400' : 'bg-blue-400'}`} />
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {pet.name}
                          <span className="text-[10px] font-normal text-slate-400 border border-slate-200 px-1.5 rounded-full bg-slate-50">
                            {pet.breed}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                           {pet.appointments?.length || 0} visitas registradas
                        </div>
                      </div>
                    </div>
                    {(pet.allergies || pet.behavior_notes) && (
                      <div className="mt-3 pt-2 border-t border-slate-100 grid gap-1">
                        {pet.allergies && (
                          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span className="font-bold">Alergia: {pet.allergies}</span>
                          </div>
                        )}
                        {pet.behavior_notes && (
                          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-1.5 rounded">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span>Nota: {pet.behavior_notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-slate-100">
             <Link href={`/clients/${client.id}`} className="w-full">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-base shadow-md">
                   Abrir Expediente Completo <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
             </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}