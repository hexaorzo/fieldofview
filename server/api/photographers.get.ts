import { z } from 'zod'
import { getSupabaseServerClient } from '../utils/supabase'

const QuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(['newest', 'name_asc', 'name_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12)
})

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)
  const query = QuerySchema.parse(getQuery(event))

  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1

  let builder = supabase
    .from('profiles')
    .select('id,username,display_name,about,avatar_url,moderation_status,role,profile_tags(tag_slug)', { count: 'exact' })
    .eq('moderation_status', 'approved')
    .eq('role', 'photographer')

  if (query.q) {
    builder = builder.or(`username.ilike.%${query.q}%,display_name.ilike.%${query.q}%`)
  }

  if (query.tag) {
    builder = builder.eq('profile_tags.tag_slug', query.tag)
  }

  if (query.sort === 'name_asc') {
    builder = builder.order('display_name', { ascending: true, nullsFirst: false }).order('username', { ascending: true })
  } else if (query.sort === 'name_desc') {
    builder = builder.order('display_name', { ascending: false, nullsFirst: false }).order('username', { ascending: false })
  } else {
    builder = builder.order('created_at', { ascending: false })
  }

  const { data, error, count } = await builder.range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    items: (data ?? []).map(item => ({
      ...item,
      profile_tags: Array.isArray(item.profile_tags) ? item.profile_tags : []
    })),
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0
  }
})

