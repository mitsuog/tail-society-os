'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. GESTIÓN FINANCIERA (Nómina y Contratos) ---

export async function updateEmployeeFinancials(employeeId: string, data: any) {
  const supabase = await createClient();

  // Actualizar configuración de comisiones en el empleado
  const { error: empError } = await supabase
    .from('employees')
    .update({
      commission_type: data.commission_type,
      participation_pct: data.participation_pct,
    })
    .eq('id', employeeId);

  if (empError) throw new Error("Error al actualizar empleado: " + empError.message);

  // Calcular totales
  const totalSalary = Number(data.salary_bank) + Number(data.salary_cash);
  
  // Metadata para desglose Banco vs Efectivo
  const salaryMetadata = {
    bank_dispersion: Number(data.salary_bank),
    cash_difference: Number(data.salary_cash)
  };

  // Buscar contrato activo
  const { data: contracts } = await supabase
    .from('employee_contracts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_active', true);

  if (contracts && contracts.length > 0) {
    // Actualizar contrato existente
    const { error: contractError } = await supabase
      .from('employee_contracts')
      .update({
        base_salary_weekly: totalSalary,
        metadata: salaryMetadata
      })
      .eq('id', contracts[0].id);

    if (contractError) throw new Error("Error al actualizar contrato: " + contractError.message);
  } else {
    // Crear nuevo contrato si no existe
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

// --- 2. GESTIÓN DE PERSONAL (CRUD y Perfil) ---

export async function createEmployee(data: any) {
  const supabase = await createClient();
  
  // Insertar empleado
  const { data: newEmp, error } = await supabase.from('employees').insert({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    color: data.color || '#64748b',
    active: true,
    show_in_calendar: data.show_in_calendar,
    commission_type: 'total', // Default
    participation_pct: 0      // Default
  }).select().single();

  if (error) throw new Error("Error creando empleado: " + error.message);
  
  // Crear contrato inicial en ceros para evitar errores en nómina
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
        show_in_calendar: !currentStatus // Si se desactiva, se quita del calendario automáticamente
    }).eq('id', id);

    if (error) throw new Error("Error cambiando estatus: " + error.message);
    revalidatePath('/admin/staff');
    return { success: true };
}

// --- 3. GESTIÓN DE AUSENCIAS Y VACACIONES ---

export async function addEmployeeAbsence(employeeId: string, type: string, start: Date, end: Date, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('employee_absences').insert({
    employee_id: employeeId,
    type, // 'vacation', 'sick', 'personal', 'unjustified'
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    reason: notes
  });

  if (error) throw new Error("Error registrando ausencia: " + error.message);
  revalidatePath('/admin/staff');
  revalidatePath('/admin/payroll'); // Recalcular nómina
  return { success: true };
}

// --- 4. EXPEDIENTE DIGITAL (Documentos) ---

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
    // Nota: Aquí solo borramos la referencia en la BD. 
    // Para borrar el archivo físico de Storage se requiere un paso adicional en el cliente o una función backend más compleja.
    const { error } = await supabase.from('employee_documents').delete().eq('id', docId);
    
    if (error) throw new Error("Error borrando documento: " + error.message);
    revalidatePath('/admin/staff');
    return { success: true };
}