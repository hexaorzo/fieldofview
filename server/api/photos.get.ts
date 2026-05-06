import { z } from 'zod'
import { getSupabaseServerClient } from '../utils/supabase'

const QuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  event: z.string().optional(),
  sort: z.enum(['featured', 'newest', 'oldest']).default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24)
})

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)
  const query = QuerySchema.parse(getQuery(event))

  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1

  let builder = supabase
    .from('photos')
    .select('id,profile_id,title,description,event_type,visibility,image_path,created_at,is_featured,photo_tags(tag_slug),profiles(username,display_name,avatar_url)', { count: 'exact' })
    .eq('visibility', 'public')

  if (query.event) {
    builder = builder.eq('event_type', query.event)
  }

  if (query.tag) {
    builder = builder.eq('photo_tags.tag_slug', query.tag)
  }

  if (query.q) {
    builder = builder.or(`title.ilike.%${query.q}%,description.ilike.%${query.q}%`)
  }

  if (query.sort === 'oldest') {
    builder = builder.order('created_at', { ascending: true })
  } else if (query.sort === 'newest') {
    builder = builder.order('created_at', { ascending: false })
  } else {
    builder = builder.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  }

  const { data, error, count } = await builder.range(from, to)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    items: (data ?? []).map(item => ({
      ...item,
      photo_tags: Array.isArray(item.photo_tags) ? item.photo_tags : []
    })),
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0
  }
})

