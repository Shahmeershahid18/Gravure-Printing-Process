'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// --- Schemas ---

export const MachineSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required').optional(),
  stations: z.number().int().default(8),
  max_web_width_mm: z.number().int().optional().nullable(),
  max_speed_mpm: z.number().int().optional().nullable(),
  dryer_zones: z.number().int().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().or(z.literal('')).nullable(),
  notes: z.string().optional().nullable(),
})

export const SupplierSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
})

export const ColourNameSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sort_order: z.number().int().default(100),
  is_active: z.boolean().default(true),
})

export const IssueTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  area: z.string().min(1, 'Area is required'),
  title: z.string().min(1, 'Title is required'),
  hint: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const CylinderLifeRuleSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional().nullable(),
  screen_lpi_min: z.number().int().optional().nullable(),
  screen_lpi_max: z.number().int().optional().nullable(),
  limit_meters: z.number().int().min(1, 'Limit is required'),
  priority: z.number().int().default(100),
  notes: z.string().optional().nullable(),
})

// --- Server Actions ---

// Machine
export async function saveMachine(data: z.infer<typeof MachineSchema>) {
  const supabase = await createClient()
  const parsed = MachineSchema.parse(data)
  
  if (parsed.id) {
    const { error } = await supabase.from('machines').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('machines').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/settings/machines')
}

// Customer
export async function saveCustomer(data: z.infer<typeof CustomerSchema>) {
  const supabase = await createClient()
  const parsed = CustomerSchema.parse(data)

  if (parsed.id) {
    const { error } = await supabase.from('customers').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('customers').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/settings/customers')
}

// Supplier
export async function saveSupplier(data: z.infer<typeof SupplierSchema>) {
  const supabase = await createClient()
  const parsed = SupplierSchema.parse(data)

  if (parsed.id) {
    const { error } = await supabase.from('suppliers').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('suppliers').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/settings/suppliers')
}

// ColourName
export async function saveColourName(data: z.infer<typeof ColourNameSchema>, oldName?: string) {
  const supabase = await createClient()
  const parsed = ColourNameSchema.parse(data)

  if (oldName) {
    const { error } = await supabase.from('colour_names').update(parsed).eq('name', oldName)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('colour_names').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/settings/colours')
}

// IssueTemplate
export async function saveIssueTemplate(data: z.infer<typeof IssueTemplateSchema>) {
  const supabase = await createClient()
  const parsed = IssueTemplateSchema.parse(data)

  if (parsed.id) {
    const { error } = await supabase.from('issue_templates').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('issue_templates').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/settings/issue-templates')
}

// CylinderLifeRule
export async function saveCylinderLifeRule(data: z.infer<typeof CylinderLifeRuleSchema>) {
  const supabase = await createClient()
  const parsed = CylinderLifeRuleSchema.parse(data)

  if (parsed.id) {
    const { error } = await supabase.from('cylinder_life_rules').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('cylinder_life_rules').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/settings/life-rules')
}

// --- Ink Products & Batches ---
export const InkProductSchema = z.object({
  id: z.string().uuid().optional(),
  ink_code: z.string().min(1, 'Ink code is required'),
  colour_name: z.string().min(1, 'Colour name is required'),
  is_self_colour: z.boolean().default(false),
  pantone_ref: z.string().optional().nullable(),
  ink_system: z.string().min(1, 'Ink system is required'),
  technology: z.string().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  base_formula: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const InkBatchSchema = z.object({
  id: z.string().uuid().optional(),
  ink_product_id: z.string().uuid().min(1, 'Product is required'),
  batch_no: z.string().min(1, 'Batch number is required'),
  mfg_date: z.string().optional().nullable(),
  received_date: z.string().optional().nullable(),
  qty_kg: z.number().optional().nullable(),
  supplier_lot: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
})

export async function saveInkProduct(data: z.infer<typeof InkProductSchema>) {
  const supabase = await createClient()
  const parsed = InkProductSchema.parse(data)
  if (parsed.id) {
    const { error } = await supabase.from('ink_products').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('ink_products').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/inks')
}

export async function saveInkBatch(data: z.infer<typeof InkBatchSchema>) {
  const supabase = await createClient()
  const parsed = InkBatchSchema.parse(data)
  if (parsed.id) {
    const { error } = await supabase.from('ink_batches').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('ink_batches').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/inks')
}

// --- Substrate Batches ---
export const SubstrateBatchSchema = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().min(1, 'Supplier is required'),
  material_type: z.string().min(1, 'Material type is required'),
  grade: z.string().optional().nullable(),
  thickness_micron: z.number().min(0),
  width_mm: z.number().optional().nullable(),
  batch_no: z.string().min(1, 'Batch number is required'),
  lot_no: z.string().optional().nullable(),
  treatment_dyne_supplier: z.number().optional().nullable(),
  gsm: z.number().optional().nullable(),
  received_date: z.string().optional().nullable(),
  qty_kg: z.number().optional().nullable(),
  coa_url: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
})

export async function saveSubstrateBatch(data: z.infer<typeof SubstrateBatchSchema>) {
  const supabase = await createClient()
  const parsed = SubstrateBatchSchema.parse(data)
  if (parsed.id) {
    const { error } = await supabase.from('substrate_batches').update(parsed).eq('id', parsed.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('substrate_batches').insert(parsed)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/substrates')
}
