export default defineNuxtPlugin({
  name: 'auth-init',
  dependsOn: ['supabase-client'],
  async setup() {
    const { refreshSession } = useAuth()
    await refreshSession()
  }
})

