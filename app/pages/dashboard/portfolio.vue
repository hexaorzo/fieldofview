<script setup lang="ts">
definePageMeta({ middleware: ['photographer'] })

const supabase = useSupabase()
const { user } = useAuth()
const { portfolioImage } = useMedia()
const toast = useToast()

type PhotoItem = {
  id: string
  image_path: string
  title: string | null
  visibility: 'public' | 'private'
}

type Response = { items: PhotoItem[] }

const { data, pending, refresh } = await useFetch<Response>('/api/me/photos')

const uploading = ref(false)
const createState = reactive({
  title: '',
  event_type: '',
  visibility: 'public' as 'public' | 'private'
})

async function onPickFile(files: FileList | null) {
  const file = files?.[0]
  if (!file) return

  uploading.value = true
  try {
    if (!user.value?.id) {
      throw new Error('You must be logged in to upload photos.')
    }
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.value.id}/uploads/${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('portfolio').upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    })
    if (uploadErr) throw uploadErr

    await $fetch('/api/me/photos', {
      method: 'POST',
      body: {
        image_path: path,
        title: createState.title || undefined,
        event_type: createState.event_type || undefined,
        visibility: createState.visibility
      }
    })

    toast.add({ title: 'Uploaded' })
    createState.title = ''
    createState.event_type = ''
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Upload failed', description: e?.message ?? String(e), color: 'error' })
  } finally {
    uploading.value = false
  }
}

async function remove(photoId: string) {
  try {
    await $fetch(`/api/me/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.message ?? String(e), color: 'error' })
  }
}
</script>

<template>
  <UPage>
    <UPageHeader title="Portfolio" description="Upload and manage your photos." />

    <UPageBody class="space-y-6">
      <UCard class="space-y-5">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <UFormField label="Title (optional)">
            <UInput v-model="createState.title" placeholder="Sunset ceremony" />
          </UFormField>
          <UFormField label="Event type (optional)">
            <UInput v-model="createState.event_type" placeholder="wedding, portrait, …" />
          </UFormField>
          <UFormField label="Visibility">
            <USelect v-model="createState.visibility" :items="['public', 'private']" />
          </UFormField>
        </div>

        <div class="flex flex-col items-start gap-2 border-t border-default/60 pt-4 sm:flex-row sm:items-center sm:gap-3">
          <UButton color="primary" :loading="uploading" icon="i-lucide-upload">
            <label class="cursor-pointer">
              <input type="file" accept="image/*" class="hidden" @change="(e: any) => onPickFile(e.target.files)">
              Upload photo
            </label>
          </UButton>
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()">
            Refresh
          </UButton>
        </div>
      </UCard>

      <div v-if="pending" class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <USkeleton v-for="n in 12" :key="n" class="h-40" />
      </div>

      <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <UCard v-for="ph in data?.items || []" :key="ph.id" class="p-0 overflow-hidden">
          <div class="aspect-[4/3] bg-muted/30">
            <img
              v-if="portfolioImage(ph.image_path, 'card')"
              :src="portfolioImage(ph.image_path, 'card')!"
              :alt="ph.title || 'Photo'"
              class="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            >
          </div>
          <div class="p-4 space-y-2">
            <p class="font-medium truncate">{{ ph.title || 'Untitled' }}</p>
            <div class="flex items-center justify-between gap-2">
              <UBadge color="neutral" variant="soft">{{ ph.visibility }}</UBadge>
              <UButton size="xs" color="error" variant="soft" @click="remove(ph.id)">Delete</UButton>
            </div>
          </div>
        </UCard>
      </div>
    </UPageBody>
  </UPage>
</template>

