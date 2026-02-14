'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { MoreHorizontal, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserRole } from '@/hooks/useUserRole'; // Hook para verificar rol
import EditClientDialog from '@/components/EditClientDialog';
import DeleteAlert from '@/components/DeleteAlert'; // Componente de alerta
import { toast } from 'sonner';

interface ClientActionsProps {
  client: any; // O usa la interfaz Client definida en tu proyecto
}

export default function ClientActions({ client }: ClientActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { role } = useUserRole(); // Obtenemos el rol del usuario actual
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Eliminar el cliente
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      toast.success('Cliente eliminado correctamente');
      setIsDeleteOpen(false);
      router.refresh(); // Recargar la tabla
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar cliente: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(client.id)}
          >
            Copiar ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          {/* Opción de Ver Detalle */}
          <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
            <FileText className="mr-2 h-4 w-4" /> Ver Expediente
          </DropdownMenuItem>

          {/* Opción de Editar */}
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>

          {/* Opción de Eliminar (Solo Admin) */}
          {role === 'admin' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteOpen(true)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diálogo de Edición */}
      <EditClientDialog 
        client={client} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      {/* Alerta de Eliminación */}
      <DeleteAlert
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title="¿Estás seguro?"
        description={`Esta acción eliminará permanentemente al cliente ${client.full_name} y todos sus datos asociados (mascotas, citas, historial). Esta acción no se puede deshacer.`}
        loading={isDeleting}
      />
    </>
  );
}