import { requireUser, getProfileByUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const profile = await getProfileByUserId(event, user.id)

  if (!profile) {
    return {
      user,
      profile: null,
      stats: {
        publicPhotoCount: 0,
        tagCount: 0
      }
    }
  }

  const [{ data: profileTags, error: tagsError }, { count: publicPhotoCount, error: photoCountError }] = await Promise.all([
    supabase
      .from('profile_tags')
      .select('tag_slug')
      .eq('profile_id', profile.id),
    supabase
      .from('photos')
      .select('id', { head: true, count: 'exact' })
      .eq('profile_id', profile.id)
      .eq('visibility', 'public')
  ])

  if (tagsError) throw createError({ statusCode: 500, statusMessage: tagsError.message })
  if (photoCountError) throw createError({ statusCode: 500, statusMessage: photoCountError.message })

  return {
    user,
    profile: {
      ...profile,
      profile_tags: profileTags ?? []
    },
    stats: {
      publicPhotoCount: publicPhotoCount ?? 0,
      tagCount: profileTags?.length ?? 0
    }
  }
})

