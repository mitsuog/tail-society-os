'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; 

import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteAlertProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean; // Propiedad añadida
  onOpenChange?: (open: boolean) => void; // Propiedad añadida
  loading?: boolean; // Propiedad añadida para manejar estado de carga externo
}

export default function DeleteAlert({ title, description, onConfirm, trigger, open, onOpenChange, loading: externalLoading }: DeleteAlertProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  
  // Usar loading externo si se provee, sino el interno
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (externalLoading === undefined) setInternalLoading(true);
    
    await onConfirm();
    
    if (externalLoading === undefined) setInternalLoading(false);
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <AlertDialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 size={16} />
            </Button>
          )}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600 flex items-center gap-2">
            <Trash2 size={20} /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={() => setIsOpen && setIsOpen(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            className="bg-red-600 hover:bg-red-700 text-white border-red-700"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Sí, eliminar definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}