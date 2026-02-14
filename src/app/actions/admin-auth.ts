'use server'

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from 'next/cache';

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

// Definimos el tipo de respuesta estricto
type ActionResponse = 
  | { success: true; userId?: string } 
  | { success: false; error: string };

// --- 1. VALIDACIONES ---

async function checkAdminPermissions() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Sesión expirada o no autenticado.");

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!roles || roles.role !== 'admin') {
    throw new Error("Acceso denegado: Se requieren permisos de Administrador.");
  }
}

function checkDemoRestriction() {
  // Verificamos explícitamente el string 'true'
  if (process.env.NEXT_PUBLIC_IS_DEMO === 'true') {
    throw new Error("🔒 MODO DEMO: Esta acción está restringida por seguridad.");
  }
}

// --- 2. WRAPPER SEGURO ---
// Este wrapper asegura que NUNCA se lance un error 500 al cliente, sino un 200 con success: false
async function safeAction(action: () => Promise<ActionResponse>): Promise<ActionResponse> {
    try {
        // 1. Validar Demo primero (la más rápida)
        checkDemoRestriction();
        
        // 2. Validar Permisos
        await checkAdminPermissions();
        
        // 3. Ejecutar acción real
        return await action();
    } catch (error: any) {
        console.error("Admin Action Error:", error.message); // Log en servidor para debug
        return { 
            success: false, 
            error: error.message || "Ocurrió un error inesperado en el servidor." 
        };
    }
}

// --- 3. ACCIONES EXPORTADAS ---

export async function adminCreateUser(formData: FormData): Promise<ActionResponse> {
  return safeAction(async () => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const fullName = formData.get('fullName') as string;
      const role = formData.get('role') as string;

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) throw new Error(authError.message);
      if (!authUser.user) throw new Error("No se pudo crear el usuario en Auth.");

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          id: authUser.user.id,
          role: role,
          full_name: fullName
        });

      if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error("Error al asignar rol: " + roleError.message);
      }

      revalidatePath('/admin/users');
      return { success: true, userId: authUser.user.id };
  });
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<ActionResponse> {
  return safeAction(async () => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (error) throw new Error(error.message);

      revalidatePath('/admin/users');
      return { success: true };
  });
}

export async function adminDeleteUser(userId: string): Promise<ActionResponse> {
  return safeAction(async () => {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) throw new Error(error.message);

      revalidatePath('/admin/users');
      return { success: true };
  });
}