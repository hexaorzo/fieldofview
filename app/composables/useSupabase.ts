import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabase() {
  const nuxtApp = useNuxtApp()
  const { $supabase } = nuxtApp
  return $supabase as SupabaseClient
}

