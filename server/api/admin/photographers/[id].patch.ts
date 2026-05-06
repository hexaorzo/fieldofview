import { z } from 'zod'
import { requireRole } from '../../../utils/auth'
import { getSupabaseServiceClient } from '../../../utils/supabase'

const ParamsSchema = z.object({ id: z.string().min(1) })
const BodySchema = z.object({
  moderation_status: z.enum(['pending', 'approved', 'suspended']).optional()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')

  const { id } = ParamsSchema.parse(event.context.params || {})
  const body = BodySchema.parse(await readBody(event))

  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', id)
    .select('id,user_id,username,display_name,moderation_status,role')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { profile: data }
})

