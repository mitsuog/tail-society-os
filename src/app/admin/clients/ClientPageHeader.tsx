'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { UserPlus } from 'lucide-react';
import AddClientDialog from '@/components/AddClientDialog'; 

export default function ClientPageHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm"
      >
        <UserPlus size={16} />
        Nuevo Cliente
      </Button>

      {/* Aquí controlamos el estado localmente */}
      <AddClientDialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  );
}