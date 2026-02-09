'use server'

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from 'next/cache';

// Cliente ADMIN con superpoderes (Solo usar en servidor)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Verificar que quien llama es realmente Admin
async function checkAdminPermissions() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("No autenticado");

  // Verificar rol en base de datos
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!roles || roles.role !== 'admin') {
    throw new Error("No tienes permisos de Administrador");
  }
  return true;
}

// 1. CREAR NUEVO USUARIO DE SISTEMA
export async function adminCreateUser(formData: FormData) {
  await checkAdminPermissions();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const role = formData.get('role') as string; // 'admin', 'receptionist', 'employee'

  // Crear usuario en Auth (Supabase Auth)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirmar email
    user_metadata: { full_name: fullName }
  });

  if (authError) throw new Error(authError.message);
  if (!authUser.user) throw new Error("No se pudo crear el usuario");

  // Insertar rol en user_roles
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      id: authUser.user.id,
      role: role,
      full_name: fullName
    });

  if (roleError) {
    // Si falla el rol, borramos el usuario de Auth para no dejar basura
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw new Error("Error asignando rol: " + roleError.message);
  }

  revalidatePath('/admin/users');
  return { success: true, userId: authUser.user.id };
}

// 2. CAMBIAR CONTRASEÑA (RESET PASSWORD)
export async function adminResetPassword(userId: string, newPassword: string) {
  await checkAdminPermissions();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (error) throw new Error("Error al cambiar contraseña: " + error.message);

  revalidatePath('/admin/users');
  return { success: true };
}

// 3. ELIMINAR USUARIO
export async function adminDeleteUser(userId: string) {
  await checkAdminPermissions();

  // Esto borrará al usuario de Auth.
  // Gracias al "ON DELETE CASCADE" de tu base de datos, debería borrar user_roles automáticamente.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) throw new Error("Error eliminando usuario: " + error.message);

  revalidatePath('/admin/users');
  return { success: true };
}