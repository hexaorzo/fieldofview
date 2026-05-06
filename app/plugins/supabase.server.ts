import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { parseCookies, setCookie } from 'h3'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const event = nuxtApp.ssrContext?.event

  if (!event) {
    return
  }

  const supabase = createServerClient(
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
  return {
    provide: {
      supabase
    }
  }
})

