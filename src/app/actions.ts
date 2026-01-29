// src/app/actions.ts
'use server'

import { createClient } from '../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function registerClientAndPet(formData: FormData) {
  const supabase = await createClient()

  // 1. Extraer datos
  const ownerName = formData.get('ownerName') as string
  const phone = formData.get('phone') as string
  const petName = formData.get('petName') as string
  const breed = formData.get('breed') as string

  // 2. Insertar Cliente
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert([{ full_name: ownerName, phone: phone }])
    .select()
    .single()

  if (clientError) {
    console.error('Error creando cliente:', clientError)
    return // <--- CAMBIO: Ya no devolvemos un objeto, solo "return" (void)
  }

  // 3. Insertar Mascota
  const { error: petError } = await supabase
    .from('pets')
    .insert([
      {
        name: petName,
        breed: breed,
        client_id: clientData.id
      }
    ])

  if (petError) {
    console.error('Error creando mascota:', petError)
    return // <--- CAMBIO: Return vacío para complacer a TypeScript
  }

  // 4. Éxito
  console.log('Registro Exitoso:', clientData)
  redirect('/?success=true')
}