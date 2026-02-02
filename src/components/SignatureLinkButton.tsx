'use client';

import { Button } from "@/components/ui/button";
import { Link2, Check } from 'lucide-react';
import { toast } from "sonner";
import { useState } from "react";

export default function SignatureLinkButton({ clientId }: { clientId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Generamos el link (Asumiendo que crearás una ruta publica /sign/[id])
    const url = `${window.location.origin}/sign/${clientId}`;
    
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Enlace de firma copiado al portapapeles");
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleCopy}
      className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
    >
      {copied ? <Check size={16} className="mr-2" /> : <Link2 size={16} className="mr-2" />}
      {copied ? "Enlace Copiado" : "Copiar Link de Firma"}
    </Button>
  );
}