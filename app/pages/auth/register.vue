<script setup lang="ts">
const { signUp, user } = useAuth()
const toast = useToast()

const state = reactive({
  email: '',
  password: '',
  username: '',
  displayName: ''
})

watchEffect(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})

async function onSubmit() {
  try {
    await signUp({
      email: state.email,
      password: state.password,
      username: state.username,
      displayName: state.displayName || undefined
    })
    toast.add({ title: 'Account created', description: 'Check your email if confirmation is enabled.' })
    await navigateTo('/dashboard')
  } catch (e: any) {
    toast.add({ title: 'Registration failed', description: e?.message ?? String(e), color: 'error' })
  }
}
</script>

<template>
  <UPage>
    <UPageHeader title="Create account" description="Start as a photographer (pending approval)." />
    <UPageBody class="flex justify-center">
      <UCard class="w-full max-w-md">
        <UForm :state="state" @submit.prevent="onSubmit">
          <div class="space-y-5">
            <UFormField label="Email">
              <UInput v-model="state.email" type="email" autocomplete="email" required />
            </UFormField>
            <UFormField label="Password">
              <UInput v-model="state.password" type="password" autocomplete="new-password" required />
              <template #hint>
                <span class="text-xs text-muted">Min 8 characters.</span>
              </template>
            </UFormField>
            <UFormField label="Username">
              <UInput v-model="state.username" placeholder="e.g. sara_shoots" required />
              <template #hint>
                <span class="text-xs text-muted">Letters, numbers, underscore.</span>
              </template>
            </UFormField>
            <UFormField label="Display name (optional)">
              <UInput v-model="state.displayName" placeholder="e.g. Sara Studio" />
            </UFormField>
            <div class="flex items-center justify-between gap-3">
              <UButton type="submit" color="primary">Create account</UButton>
              <UButton to="/auth/login" color="neutral" variant="ghost">Log in</UButton>
            </div>
          </div>
        </UForm>
      </UCard>
    </UPageBody>
  </UPage>
</template>

