'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Dog, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

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
      toast.error('Credenciales incorrectas', {
        description: 'Revisa tu correo y contraseña.',
      });
      setLoading(false);
    } else {
      toast.success('¡Bienvenido de nuevo!');
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Decoración de fondo (Brillos difusos) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md px-6 z-10">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          
          {/* Logo e Identidad */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 ring-1 ring-white/20">
              <Dog className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Tail Society</h1>
            <p className="text-slate-400 text-sm mt-1">Gestión Interna de Operaciones</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 transition-colors group-focus-within:text-blue-400" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@tailsociety.com"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 transition-colors group-focus-within:text-blue-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-slate-950 font-bold py-3.5 rounded-xl hover:bg-blue-50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-8">
            © 2024 Tail Society OS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}