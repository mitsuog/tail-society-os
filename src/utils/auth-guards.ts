import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdminAccess() {
  const supabase = await createClient();
  
  // 1. Verificar si hay usuario logueado
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    // Si no está logueado, mandar a login
    redirect('/login');
  }

  // 2. Verificar rol en la base de datos
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single();

  // 3. Si no es admin, expulsar (ej. al dashboard general)
  // Ajusta '/dashboard' a la ruta donde quieres que caigan los empleados normales
  if (roleData?.role !== 'admin') {
    redirect('/'); 
  }
}