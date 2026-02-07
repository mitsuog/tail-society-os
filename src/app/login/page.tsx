'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      toast.error('Error de acceso', { 
        description: error.message === 'Invalid login credentials' 
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.' 
          : error.message 
      });
      setLoading(false);
    } else {
      toast.success('¡Bienvenido de vuelta!', {
        description: 'Accediendo al sistema...',
      });
      router.refresh();
      router.push('/admin/calendar');
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/40 relative">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 -right-4 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] opacity-20" />
      </div>

      {/* Left Side - Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 bg-gradient-to-br from-[#1a1f35] via-[#2E3856] to-[#1e2841] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,184,212,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
        
        {/* Floating Shapes */}
        <div className="absolute top-20 left-20 w-20 h-20 border-2 border-cyan-400/20 rounded-xl rotate-12 animate-float" />
        <div className="absolute bottom-32 right-24 w-16 h-16 border-2 border-blue-400/20 rounded-full animate-float animation-delay-1000" />
        <div className="absolute top-1/2 right-16 w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg rotate-45 animate-float animation-delay-2000" />
        
        <div className="relative z-10 max-w-lg space-y-10 animate-fade-in-up">
          {/* Logo Section */}
          <div className="flex justify-center mb-12">
            <div className="relative group cursor-pointer">
              {/* Glow Effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition duration-1000 animate-pulse-slow" />
              {/* Logo Container */}
              <div className="relative bg-gradient-to-br from-white to-slate-100 p-5 rounded-full shadow-2xl ring-4 ring-white/10">
                <Image
                  src="/Logo500x500.png"
                  alt="Tail Society"
                  width={140}
                  height={140}
                  className="drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Heading Section */}
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-6xl font-black text-white tracking-tight leading-none">
                Tail Society
              </h1>
              <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full" />
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 animate-gradient">
                Operating System
              </p>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md mx-auto">
              La plataforma más avanzada para gestión profesional de cuidado de mascotas
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-4">
            {[
              { icon: '📅', title: 'Gestión Inteligente', desc: 'Calendario y citas optimizado' },
              { icon: '🐾', title: 'Perfiles Completos', desc: 'Historial detallado de mascotas' },
              { icon: '📊', title: 'Analytics Pro', desc: 'Métricas en tiempo real' },
            ].map((feature, index) => (
              <div
                key={index}
                className="group flex items-center gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="text-4xl group-hover:scale-110 transition-transform duration-500">{feature.icon}</div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base mb-1">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-cyan-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
              </div>
            ))}
          </div>

          {/* Bottom Decoration */}
          <div className="pt-8 flex items-center justify-center gap-2 opacity-30">
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-cyan-400" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
            <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-cyan-400" />
          </div>
        </div>

        {/* Decorative Paw Prints */}
        <div className="absolute bottom-12 left-12 opacity-5 rotate-12">
          <div className="flex gap-6">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-7xl animate-float" style={{ animationDelay: `${i * 300}ms` }}>🐾</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-lg space-y-8 animate-fade-in-up animation-delay-200">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 rounded-full blur-xl opacity-60 animate-pulse-slow" />
              <div className="relative bg-white p-4 rounded-full shadow-2xl">
                <Image
                  src="/Logo500x500.png"
                  alt="Tail Society"
                  width={90}
                  height={90}
                  className="drop-shadow-xl"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="relative group">
            {/* Card Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 rounded-[2rem] blur-lg opacity-20 group-hover:opacity-30 transition duration-1000" />
            
            {/* Card Content */}
            <div className="relative bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/40 p-10 lg:p-12 space-y-8 overflow-hidden">
              {/* Top Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 rounded-t-[2rem]" />

              {/* Decorative Corner Elements */}
              <div className="absolute top-8 right-8 w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full opacity-50 blur-2xl" />
              <div className="absolute bottom-8 left-8 w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full opacity-50 blur-2xl" />

              {/* Header */}
              <div className="text-center space-y-4 relative">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Sparkles className="w-7 h-7 text-cyan-500 animate-pulse" />
                  <h2 className="text-4xl font-black bg-gradient-to-r from-[#2E3856] via-[#00B8D4] to-[#2E3856] bg-clip-text text-transparent">
                    Bienvenido
                  </h2>
                  <Sparkles className="w-7 h-7 text-cyan-500 animate-pulse animation-delay-500" />
                </div>
                <p className="text-slate-600 font-semibold text-base">
                  Inicia sesión en tu cuenta
                </p>
              </div>

              {/* Form */}
              <form className="space-y-6 relative" onSubmit={handleLogin}>
                {/* Email Input */}
                <div className="space-y-3">
                  <Label 
                    htmlFor="email" 
                    className="text-slate-700 font-bold flex items-center gap-2 text-sm"
                  >
                    <Mail className="w-4 h-4 text-cyan-500" />
                    Correo Electrónico
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-4 pr-4 py-7 text-base border-2 border-slate-200 rounded-2xl focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md font-medium"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-3">
                  <Label 
                    htmlFor="password" 
                    className="text-slate-700 font-bold flex items-center gap-2 text-sm"
                  >
                    <Lock className="w-4 h-4 text-cyan-500" />
                    Contraseña
                  </Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-4 pr-12 py-7 text-base border-2 border-slate-200 rounded-2xl focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-slate-300 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 w-5 h-5"
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm font-semibold text-slate-700 cursor-pointer hover:text-cyan-600 transition-colors"
                    >
                      Recordarme
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-bold text-cyan-600 hover:text-cyan-700 transition-colors hover:underline decoration-2 underline-offset-2"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full py-7 text-base font-bold rounded-2xl bg-gradient-to-r from-[#2E3856] via-[#00B8D4] to-[#2E3856] text-white shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-500 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden bg-size-200 bg-pos-0 hover:bg-pos-100"
                >
                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <span className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Accediendo...</span>
                      </>
                    ) : (
                      <>
                        <span>Iniciar Sesión</span>
                        <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Footer Note */}
              <div className="text-center pt-6 border-t border-slate-200/80 relative">
                <p className="text-sm text-slate-500 font-medium">
                  Sistema protegido por{' '}
                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Tail Society</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Help Text */}
          <div className="text-center">
            <p className="text-sm text-slate-600 font-medium">
              ¿Necesitas ayuda?{' '}
              <button className="font-bold text-cyan-600 hover:text-cyan-700 transition-colors hover:underline decoration-2 underline-offset-2">
                Contacta soporte
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(40px, -60px) scale(1.1);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.9);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .animate-blob {
          animation: blob 8s infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-500 {
          animation-delay: 500ms;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .bg-size-200 {
          background-size: 200% 100%;
        }

        .bg-pos-0 {
          background-position: 0% 0%;
        }

        .bg-pos-100 {
          background-position: 100% 0%;
        }
      `}</style>
    </div>
  );
}