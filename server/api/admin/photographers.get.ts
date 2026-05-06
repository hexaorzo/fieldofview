import { z } from 'zod'
import { requireRole } from '../../utils/auth'
import { getSupabaseServiceClient } from '../../utils/supabase'

const QuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'suspended']).optional()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const query = QuerySchema.parse(getQuery(event))

  const supabase = getSupabaseServiceClient()

  let builder = supabase
    .from('profiles')
    .select('id,user_id,username,display_name,about,avatar_url,role,moderation_status,created_at')
    .eq('role', 'photographer')

  if (query.status) {
    builder = builder.eq('moderation_status', query.status)
  }

  const { data, error } = await builder.order('created_at', { ascending: false }).limit(200)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { items: data ?? [] }
})

