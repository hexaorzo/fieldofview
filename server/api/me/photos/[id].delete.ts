import { z } from 'zod'
import { requireRole } from '../../../utils/auth'
import { getSupabaseServerClient } from '../../../utils/supabase'

const ParamsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const { profile } = await requireRole(event, 'photographer')
  const supabase = getSupabaseServerClient(event)
  const { id } = ParamsSchema.parse(event.context.params || {})

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})

