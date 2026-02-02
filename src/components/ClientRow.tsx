'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Phone, AlertCircle, Pencil, Mail, User } from 'lucide-react';
import EditClientDialog from './EditClientDialog';
import DeleteAlert from './DeleteAlert'; // <--- Importamos el nuevo componente
import { toast } from 'sonner';

const formatDate = (date: Date | null) => {
  if (!date) return 'Nunca';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }).format(date);
};

export default function ClientRow({ client, lastVisitDate }: any) {
  const router = useRouter();
  const supabase = createClient();

  // Lógica de Borrado de Cliente
  const handleDeleteClient = async () => {
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Cliente eliminado correctamente");
      router.refresh();
    }
  };

  // Iniciales para el Avatar
  const initials = client.full_name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Color de Estatus
  const isInactive = client.status === 'inactive';

  return (
    <TableRow className={`group transition-colors border-b border-slate-100 ${isInactive ? 'bg-slate-50/50 opacity-70' : 'hover:bg-blue-50/30'}`}>
      
      {/* COLUMNA 1: CLIENTE (Mejorada visualmente) */}
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          {/* Avatar con Iniciales */}
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${isInactive ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-blue-100 text-blue-700 border-white shadow-sm'}`}>
            {initials}
          </div>

          <div className="flex flex-col min-w-[180px]">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isInactive ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'}`}>
                {client.full_name}
              </span>
              {/* Badge de Estatus */}
              {isInactive && <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-slate-200 text-slate-500">Inactivo</Badge>}
              
              {/* Flags Internos */}
              {client.internal_tags && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Flag Interno">
                  <AlertCircle size={8} /> {client.internal_tags}
                </span>
              )}
            </div>
            
            {/* Datos de Contacto en 2 líneas para llenar espacio */}
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Phone size={10} className="text-slate-400"/> {client.phone}
              </span>
              {client.email && (
                 <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate max-w-[200px]" title={client.email}>
                   <Mail size={10} className="text-slate-300"/> {client.email}
                 </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>

      {/* COLUMNA 2: MASCOTAS (Visualmente más limpias) */}
      <TableCell>
        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
          {client.pets && client.pets.length > 0 ? (
            client.pets.map((pet: any) => (
              <Badge 
                key={pet.id} 
                variant="outline" 
                className="bg-white border-slate-200 text-slate-600 text-[10px] font-medium py-0.5 px-2 shadow-sm"
              >
                {pet.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-300 italic pl-2">Sin mascotas</span>
          )}
        </div>
      </TableCell>

      {/* COLUMNA 3: VISITAS */}
      <TableCell className="hidden md:table-cell">
        <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-700">
               {formatDate(lastVisitDate)}
            </span>
            <span className="text-[10px] text-slate-400">Última visita</span>
        </div>
      </TableCell>

      {/* COLUMNA 4: ACCIONES (Con Borrado) */}
      <TableCell className="text-right pr-4">
        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          
          <EditClientDialog 
            client={client}
            trigger={
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Editar">
                <Pencil size={14} />
              </Button>
            }
          />

          <Link href={`/clients/${client.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="Expediente">
              <Eye size={16} />
            </Button>
          </Link>

          {/* Botón de Eliminar con Confirmación */}
          <DeleteAlert 
            title="¿Eliminar Cliente?"
            description={`Estás a punto de eliminar a ${client.full_name}. Esta acción borrará permanentemente sus mascotas, historial y citas asociadas. No se puede deshacer.`}
            onConfirm={handleDeleteClient}
          />

        </div>
      </TableCell>
    </TableRow>
  );
}