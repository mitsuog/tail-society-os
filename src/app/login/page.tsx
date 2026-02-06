'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Error de acceso', { description: error.message });
      setLoading(false);
    } else {
      toast.success('Bienvenido');
      router.refresh();
      router.push('/admin/calendar'); // Redirigir al dashboard
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            TailSociety Operating System
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                placeholder="empleado@tailsociety.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar al Sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
}