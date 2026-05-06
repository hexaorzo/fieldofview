import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { parseCookies, setCookie } from 'h3'

export function getSupabaseServerClient(event: H3Event) {
  const config = useRuntimeConfig()

  return createServerClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const parsed = parseCookies(event)
          return Object.entries(parsed).map(([name, value]) => ({ name, value: String(value) }))
        },
        setAll(cookies: { name: string, value: string, options: CookieOptions }[]) {
          for (const cookie of cookies) {
            setCookie(event, cookie.name, cookie.value, cookie.options)
          }
        }
      }
    }
  )
}

export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()

  if (!config.supabaseServiceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) on server'
    })
  }

  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

