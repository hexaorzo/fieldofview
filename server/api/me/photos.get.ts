import { z } from 'zod'
import { requireRole } from '../../utils/auth'
import { getSupabaseServerClient } from '../../utils/supabase'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24)
})

export default defineEventHandler(async (event) => {
  const { profile } = await requireRole(event, 'photographer')
  const supabase = getSupabaseServerClient(event)
  const query = QuerySchema.parse(getQuery(event))

  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1

  const { data, error, count } = await supabase
    .from('photos')
    .select('id,profile_id,title,description,event_type,visibility,image_path,is_featured,created_at', { count: 'exact' })
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    items: data ?? [],
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0
  }
})

