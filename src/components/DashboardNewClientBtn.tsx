'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import AddClientDialog from '@/components/AddClientDialog';

export default function DashboardNewClientBtn() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* El botón que se ve en el Dashboard */}
      <Button 
        onClick={() => setIsOpen(true)} 
        className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm transition-all"
      >
        <Plus size={18} />
        Nuevo Cliente
      </Button>

      {/* El Modal reutilizado (invisible hasta que se activa) */}
      <AddClientDialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  );
}