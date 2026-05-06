import { z } from 'zod'
import { getSupabaseServerClient } from '../../utils/supabase'

const ParamsSchema = z.object({
  username: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)
  const { username } = ParamsSchema.parse(event.context.params || {})

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,username,display_name,about,avatar_url,moderation_status,role,profile_tags(tag_slug)')
    .eq('username', username)
    .maybeSingle()

  if (profileError) throw createError({ statusCode: 500, statusMessage: profileError.message })
  if (!profile || profile.moderation_status !== 'approved' || profile.role !== 'photographer') {
    throw createError({ statusCode: 404, statusMessage: 'Photographer not found' })
  }

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id,profile_id,title,description,event_type,visibility,image_path,created_at,photo_tags(tag_slug)')
    .eq('profile_id', profile.id)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(60)

  if (photosError) throw createError({ statusCode: 500, statusMessage: photosError.message })

  return {
    profile,
    photos: photos ?? []
  }
})

