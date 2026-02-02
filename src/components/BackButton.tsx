'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => router.back()} 
      className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full"
      title="Regresar"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}