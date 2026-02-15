'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. GESTIÓN FINANCIERA (Sin cambios) ---
export async function updateEmployeeFinancials(employeeId: string, data: any) {
  const supabase = await createClient();

  const { error: empError } = await supabase
    .from('employees')
    .update({
      commission_type: data.commission_type,
      participation_pct: data.participation_pct,
    })
    .eq('id', employeeId);

  if (empError) throw new Error("Error al actualizar empleado: " + empError.message);

  const totalSalary = Number(data.salary_bank) + Number(data.salary_cash);
  
  const salaryMetadata = {
    bank_dispersion: Number(data.salary_bank),
    cash_difference: Number(data.salary_cash)
  };

  const { data: contracts } = await supabase
    .from('employee_contracts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_active', true);

  if (contracts && contracts.length > 0) {
    const { error: contractError } = await supabase
      .from('employee_contracts')
      .update({
        base_salary_weekly: totalSalary,
        metadata: salaryMetadata
      })
      .eq('id', contracts[0].id);

    if (contractError) throw new Error("Error al actualizar contrato: " + contractError.message);
  } else {
    const { error: newContractError } = await supabase
      .from('employee_contracts')
      .insert({
        employee_id: employeeId,
        base_salary_weekly: totalSalary,
        start_date: new Date().toISOString(),
        is_active: true,
        metadata: salaryMetadata
      });

    if (newContractError) throw new Error("Error al crear contrato: " + newContractError.message);
  }

  revalidatePath('/admin/staff');
  revalidatePath('/admin/payroll');
  return { success: true };
}

// --- 2. GESTIÓN DE PERSONAL (Sin cambios) ---
export async function createEmployee(data: any) {
  const supabase = await createClient();
  
  const { data: newEmp, error } = await supabase.from('employees').insert({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    color: data.color || '#64748b',
    active: true,
    show_in_calendar: data.show_in_calendar,
    commission_type: 'total', 
    participation_pct: 0      
  }).select().single();

  if (error) throw new Error("Error creando empleado: " + error.message);
  
  const { error: contractError } = await supabase.from('employee_contracts').insert({
    employee_id: newEmp.id,
    base_salary_weekly: 0,
    start_date: new Date().toISOString(),
    is_active: true,
    metadata: { bank_dispersion: 0, cash_difference: 0 }
  });

  if (contractError) throw new Error("Error creando contrato inicial: " + contractError.message);

  revalidatePath('/admin/staff');
  return { success: true };
}

export async function updateEmployeeProfile(id: string, data: any) {
  const supabase = await createClient();
  const { error } = await supabase.from('employees').update({
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    role: data.role,
    show_in_calendar: data.show_in_calendar
  }).eq('id', id);

  if (error) throw new Error("Error actualizando perfil: " + error.message);
  revalidatePath('/admin/staff');
  return { success: true };
}

export async function toggleEmployeeStatus(id: string, currentStatus: boolean) {
    const supabase = await createClient();
    const { error } = await supabase.from('employees').update({
        active: !currentStatus,
        show_in_calendar: !currentStatus 
    }).eq('id', id);

    if (error) throw new Error("Error cambiando estatus: " + error.message);
    revalidatePath('/admin/staff');
    return { success: true };
}

// --- 3. GESTIÓN DE AUSENCIAS Y VACACIONES (MODIFICADO) ---
export async function addEmployeeAbsence(employeeId: string, type: string, start: Date, end: Date, notes: string) {
  const supabase = await createClient();
  
  // [CAMBIO IMPORTANTE]: Normalizamos el texto para evitar errores de mayúsculas/minúsculas
  const normalizedType = type.toLowerCase().trim();

  const { error } = await supabase.from('employee_absences').insert({
    employee_id: employeeId,
    type: normalizedType, // Ahora guardamos siempre en minúsculas (ej: 'unjustified', 'sick')
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    reason: notes
  });

  if (error) throw new Error("Error registrando ausencia: " + error.message);
  revalidatePath('/admin/staff');
  revalidatePath('/admin/payroll'); 
  return { success: true };
}

// --- 4. EXPEDIENTE DIGITAL (Sin cambios) ---
export async function registerDocument(employeeId: string, name: string, url: string, type: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('employee_documents').insert({
    employee_id: employeeId,
    name,
    url,
    file_type: type
  });
  
  if (error) throw new Error("Error registrando documento: " + error.message);
  revalidatePath('/admin/staff');
  return { success: true };
}

export async function deleteDocument(docId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('employee_documents').delete().eq('id', docId);
    
    if (error) throw new Error("Error borrando documento: " + error.message);
    revalidatePath('/admin/staff');
    return { success: true };
}