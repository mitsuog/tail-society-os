'use client';

import Link from 'next/link';
import { MoreHorizontal, MessageCircle, Copy, Pencil, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import EditClientDialog from '@/components/EditClientDialog';

interface ClientActionsProps {
  client: any; 
}

export default function ClientActions({ client }: ClientActionsProps) {
  
  const getWhatsappLink = (phone: string, name: string) => {
    if (!phone) return '#';
    const clean = phone.replace(/\D/g, '');
    return `https://wa.me/52${clean}?text=${encodeURIComponent(`Hola ${name.split(' ')[0]}, te contactamos de TailSociety 🐾`)}`;
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(client.phone);
    toast.success("Teléfono copiado al portapapeles");
  };

  return (
    <div className="flex justify-end items-center gap-1">
      {/* 1. WhatsApp */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700 rounded-full"
        onClick={() => window.open(getWhatsappLink(client.phone, client.full_name), '_blank')}
        title="Enviar WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>

      {/* 2. Editar Cliente */}
      <EditClientDialog 
        client={client}
        trigger={
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-full" title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />

      {/* 3. Ver Expediente (Icono Ojo) */}
      <Link href={`/clients/${client.id}`}>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-full" 
          title="Ver Expediente"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Link>

      {/* 4. Menú Extra */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyPhone} className="cursor-pointer gap-2">
            <Copy size={14} /> Copiar Teléfono
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}`} className="cursor-pointer gap-2">
               <Eye size={14} /> Ir a Expediente
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}