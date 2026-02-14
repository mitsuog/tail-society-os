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

// Define a discriminated union type for responses
type ActionResponse = 
  | { success: true; userId?: string } 
  | { success: false; error: string };

// --- 1. VALIDACIÓN DE ADMIN ---
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

// --- 2. VALIDACIÓN DE MODO DEMO (NUEVO) ---
function checkDemoRestriction() {
  if (process.env.NEXT_PUBLIC_IS_DEMO === 'true') {
    throw new Error("🔒 Acción bloqueada: No se permiten cambios de seguridad en el DEMO público.");
  }
}

// --- HELPER WRAPPER ---
// Wraps logic to catch errors and return consistent ActionResponse
async function safeAction(action: () => Promise<ActionResponse>): Promise<ActionResponse> {
    try {
        await checkAdminPermissions();
        checkDemoRestriction();
        return await action();
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- ACCIONES ---

// 1. CREAR NUEVO USUARIO DE SISTEMA
export async function adminCreateUser(formData: FormData): Promise<ActionResponse> {
  return safeAction(async () => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const fullName = formData.get('fullName') as string;
      const role = formData.get('role') as string;

      // Crear usuario en Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) throw new Error(authError.message);
      if (!authUser.user) throw new Error("No se pudo crear el usuario");

      // Insertar rol
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          id: authUser.user.id,
          role: role,
          full_name: fullName
        });

      if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error("Error asignando rol: " + roleError.message);
      }

      revalidatePath('/admin/users');
      return { success: true, userId: authUser.user.id };
  });
}

// 2. CAMBIAR CONTRASEÑA (RESET PASSWORD)
export async function adminResetPassword(userId: string, newPassword: string): Promise<ActionResponse> {
  return safeAction(async () => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (error) throw new Error("Error al cambiar contraseña: " + error.message);

      revalidatePath('/admin/users');
      return { success: true };
  });
}

// 3. ELIMINAR USUARIO
export async function adminDeleteUser(userId: string): Promise<ActionResponse> {
  return safeAction(async () => {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) throw new Error("Error eliminando usuario: " + error.message);

      revalidatePath('/admin/users');
      return { success: true };
  });
}