import { z } from 'zod'
import { requireRole } from '../../utils/auth'
import { getSupabaseServerClient } from '../../utils/supabase'

const BodySchema = z.object({
  image_path: z.string().min(1),
  title: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  event_type: z.string().max(60).optional(),
  visibility: z.enum(['public', 'private']).default('public')
})

export default defineEventHandler(async (event) => {
  const { profile } = await requireRole(event, 'photographer')
  const supabase = getSupabaseServerClient(event)
  const body = BodySchema.parse(await readBody(event))

  const { data, error } = await supabase
    .from('photos')
    .insert({
      profile_id: profile.id,
      image_path: body.image_path,
      title: body.title ?? null,
      description: body.description ?? null,
      event_type: body.event_type ?? null,
      visibility: body.visibility
    })
    .select('id,profile_id,title,description,event_type,visibility,image_path,is_featured,created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { photo: data }
})

