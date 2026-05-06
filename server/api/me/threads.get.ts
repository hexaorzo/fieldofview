import { z } from 'zod'
import { requireUser, getProfileByUserId } from '../../utils/auth'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const query = QuerySchema.parse(getQuery(event))

  const profile = await getProfileByUserId(event, user.id)
  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1

  let builder = supabase
    .from('quote_threads')
    .select('id,quote_request_id,photographer_profile_id,client_user_id,created_at,quote_request:quote_requests!quote_threads_quote_request_id_fkey(status,category,budget,timeline),photographer:profiles!quote_threads_photographer_profile_id_fkey(username,display_name,avatar_url)', { count: 'exact' })

  if (profile?.role === 'photographer') {
    builder = builder.eq('photographer_profile_id', profile.id)
  } else {
    builder = builder.eq('client_user_id', user.id)
  }

  const { data, error, count } = await builder
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

