import { z } from 'zod'
import type { H3Event } from 'h3'
import { getSupabaseServerClient } from './supabase'

export const ProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  username: z.string(),
  display_name: z.string().nullable(),
  about: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: z.enum(['visitor', 'photographer', 'admin']),
  moderation_status: z.enum(['pending', 'approved', 'suspended'])
})

export type ProfileRow = z.infer<typeof ProfileSchema>

export async function requireUser(event: H3Event) {
  const supabase = getSupabaseServerClient(event)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return { supabase, user: data.user }
}

export async function getProfileByUserId(event: H3Event, userId: string) {
  const supabase = getSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_id,username,display_name,about,avatar_url,role,moderation_status')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) return null

  return ProfileSchema.parse(data)
}

export async function requireRole(event: H3Event, role: 'photographer' | 'admin') {
  const { user } = await requireUser(event)
  const profile = await getProfileByUserId(event, user.id)
  if (!profile) throw createError({ statusCode: 403, statusMessage: 'No profile' })

  if (profile.role !== role) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return { user, profile }
}

