<script setup lang="ts">
const supabase = useSupabase()
const toast = useToast()

const state = reactive({
  email: ''
})

async function onSubmit() {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(state.email)
    if (error) throw error
    toast.add({ title: 'Password reset email sent' })
  } catch (e: any) {
    toast.add({ title: 'Failed', description: e?.message ?? String(e), color: 'error' })
  }
}
</script>

<template>
  <UPage>
    <UPageHeader title="Forgot password" />
    <UPageBody class="flex justify-center">
      <UCard class="w-full max-w-md">
        <UForm :state="state" @submit.prevent="onSubmit">
          <div class="space-y-5">
            <UFormField label="Email">
              <UInput v-model="state.email" type="email" autocomplete="email" required />
            </UFormField>
            <UButton type="submit" color="primary">Send reset email</UButton>
          </div>
        </UForm>
      </UCard>
    </UPageBody>
  </UPage>
</template>

