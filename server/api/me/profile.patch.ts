import { z } from 'zod'
import { requireUser } from '../../utils/auth'

const BodySchema = z.object({
  display_name: z.string().max(80).nullable().optional(),
  about: z.string().max(1000).nullable().optional(),
  avatar_url: z.string().max(400).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const normalizedTags = body.tags
    ? [...new Set(body.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))]
    : undefined

  const updateBody = {
    display_name: body.display_name,
    about: body.about,
    avatar_url: body.avatar_url
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateBody)
    .eq('user_id', user.id)
    .select('id,user_id,username,display_name,about,avatar_url,role,moderation_status')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  let nextTags: { tag_slug: string }[] = []

  if (normalizedTags) {
    const { data: knownTags, error: knownTagsError } = await supabase
      .from('tags')
      .select('slug')
      .in('slug', normalizedTags)

    if (knownTagsError) throw createError({ statusCode: 500, statusMessage: knownTagsError.message })

    const knownTagSet = new Set((knownTags ?? []).map(tag => tag.slug))
    const invalid = normalizedTags.filter(tag => !knownTagSet.has(tag))
    if (invalid.length) {
      throw createError({ statusCode: 400, statusMessage: `Unknown tags: ${invalid.join(', ')}` })
    }

    const { error: clearError } = await supabase
      .from('profile_tags')
      .delete()
      .eq('profile_id', data.id)

    if (clearError) throw createError({ statusCode: 500, statusMessage: clearError.message })

    if (normalizedTags.length) {
      const { error: insertError } = await supabase
        .from('profile_tags')
        .insert(normalizedTags.map(tag => ({ profile_id: data.id, tag_slug: tag })))

      if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
    }

    nextTags = normalizedTags.map(tag_slug => ({ tag_slug }))
  } else {
    const { data: currentTags, error: currentTagsError } = await supabase
      .from('profile_tags')
      .select('tag_slug')
      .eq('profile_id', data.id)

    if (currentTagsError) throw createError({ statusCode: 500, statusMessage: currentTagsError.message })
    nextTags = currentTags ?? []
  }

  return {
    profile: {
      ...data,
      profile_tags: nextTags
    }
  }
})

