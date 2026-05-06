import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase-client',
  setup() {
    const config = useRuntimeConfig()

    const supabase = createBrowserClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )

    return {
      provide: {
        supabase
      }
    }
  }
})

