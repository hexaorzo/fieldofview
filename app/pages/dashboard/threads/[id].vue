<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const { user } = useAuth()

const id = computed(() => route.params.id as string)

type ThreadResponse = {
  thread: {
    id: string
    quote_request?: { status: string, category: string } | null
  }
  messages: { id: string, sender_user_id: string, body: string, created_at: string }[]
}

const { data, pending, refresh } = await useFetch<ThreadResponse>(() => `/api/threads/${encodeURIComponent(id.value)}`)

const draft = ref('')
const sending = ref(false)

async function send() {
  if (!draft.value.trim()) return
  sending.value = true
  try {
    await $fetch(`/api/threads/${encodeURIComponent(id.value)}/messages`, {
      method: 'POST',
      body: { body: draft.value }
    })
    draft.value = ''
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Failed to send', description: e?.message ?? String(e), color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <UPage>
    <UPageHeader
      title="Thread"
      :description="data?.thread?.quote_request?.category || ''"
    >
      <template #right>
        <UButton to="/dashboard" color="neutral" variant="outline" icon="i-lucide-arrow-left">
          Back
        </UButton>
      </template>
    </UPageHeader>

    <UPageBody class="space-y-5">
      <UCard>
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted">
            Status: <span class="font-medium">{{ data?.thread?.quote_request?.status || '—' }}</span>
          </p>
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()">
            Refresh
          </UButton>
        </div>
      </UCard>

      <UCard>
        <div class="space-y-3">
          <div
            v-for="m in data?.messages || []"
            :key="m.id"
            class="flex"
            :class="m.sender_user_id === user?.id ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] rounded-lg px-3 py-2 text-sm"
              :class="m.sender_user_id === user?.id ? 'bg-primary/15' : 'bg-muted/50'"
            >
              <p class="whitespace-pre-wrap">{{ m.body }}</p>
              <p class="mt-1 text-xs text-muted">{{ new Date(m.created_at).toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <USeparator class="my-4" />

        <UForm :state="{ draft }" @submit.prevent="send">
          <div class="flex items-center gap-2">
            <UInput v-model="draft" placeholder="Write a message…" class="flex-1" />
            <UButton type="submit" color="primary" :loading="sending">Send</UButton>
          </div>
        </UForm>
      </UCard>
    </UPageBody>
  </UPage>
</template>

