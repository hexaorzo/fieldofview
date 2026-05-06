import { getSupabaseServerClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)

  const { data, error } = await supabase
    .from('tags')
    .select('slug,label')
    .order('label', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    items: data ?? []
  }
})
