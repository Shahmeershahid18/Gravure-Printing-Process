'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function loginOperator(operatorId: string, pin: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_verify_operator_pin', {
    p_profile_id: operatorId,
    p_pin: pin
  })

  if (error || !data) {
    return { success: false, error: 'Invalid PIN' }
  }

  // Set the operator cookie for the kiosk session
  cookies().set('operator_id', operatorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12 // 12 hour shift
  })

  return { success: true }
}

export async function logoutOperator() {
  cookies().delete('operator_id')
}
