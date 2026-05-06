<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

const toast = useToast()
const status = ref<'pending' | 'approved' | 'suspended'>('pending')

type Photographer = {
  id: string
  username: string
  display_name: string | null
  moderation_status: 'pending' | 'approved' | 'suspended'
}

type Response = { items: Photographer[] }

const { data, pending, refresh } = await useFetch<Response>('/api/admin/photographers', {
  query: computed(() => ({ status: status.value }))
})

async function setStatus(profileId: string, next: 'pending' | 'approved' | 'suspended') {
  try {
    await $fetch(`/api/admin/photographers/${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      body: { moderation_status: next }
    })
    toast.add({ title: 'Updated' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Failed', description: e?.message ?? String(e), color: 'error' })
  }
}
</script>

<template>
  <UPage>
    <UPageHeader title="Admin" description="Moderate photographers." />

    <UPageBody class="space-y-6">
      <UCard>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            :variant="status === 'pending' ? 'solid' : 'outline'"
            color="primary"
            @click="status = 'pending'"
          >
            Pending
          </UButton>
          <UButton
            :variant="status === 'approved' ? 'solid' : 'outline'"
            color="primary"
            @click="status = 'approved'"
          >
            Approved
          </UButton>
          <UButton
            :variant="status === 'suspended' ? 'solid' : 'outline'"
            color="primary"
            @click="status = 'suspended'"
          >
            Suspended
          </UButton>

          <div class="flex-1" />

          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()">
            Refresh
          </UButton>
        </div>
      </UCard>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UCard v-for="p in data?.items || []" :key="p.id" class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ p.display_name || p.username }}</p>
              <p class="text-sm text-muted truncate">@{{ p.username }} • {{ p.moderation_status }}</p>
            </div>
            <UButton :to="`/${p.username}`" size="sm" color="neutral" variant="outline">View</UButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="xs" color="success" variant="soft" @click="setStatus(p.id, 'approved')">Approve</UButton>
            <UButton size="xs" color="warning" variant="soft" @click="setStatus(p.id, 'pending')">Pending</UButton>
            <UButton size="xs" color="error" variant="soft" @click="setStatus(p.id, 'suspended')">Suspend</UButton>
          </div>
        </UCard>
      </div>
    </UPageBody>
  </UPage>
</template>

