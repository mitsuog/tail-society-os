'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Check } from 'lucide-react';
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// --- CORRECCIÓN: Agregamos isSigned a la definición ---
interface SignatureLinkButtonProps {
  clientId: string;
  isSigned?: boolean | null; 
}

export default function SignatureLinkButton({ clientId, isSigned = false }: SignatureLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const link = `${window.location.origin}/waiver/${clientId}`;
    navigator.clipboard.writeText(link);
    
    setCopied(true);
    toast.success("Enlace de firma copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard}
            className={cn(
                "h-9 text-xs transition-colors gap-2",
                // Lógica visual: Verde si está firmado
                isSigned 
                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                    : "text-slate-500 hover:text-slate-900 bg-white"
            )}
          >
            {copied ? <Check size={14}/> : <LinkIcon size={14}/>}
            {isSigned ? "Link Firma (Vigente)" : "Copiar Link Firma"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copiar enlace para firma digital</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}