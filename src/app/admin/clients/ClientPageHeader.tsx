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
        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md"
      >
        <UserPlus size={16} />
        Nuevo Cliente
      </Button>

      <AddClientDialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  );
}