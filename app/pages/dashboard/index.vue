<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const supabase = useSupabase()
const { user } = useAuth()
const { portfolioImage } = useMedia()
const toast = useToast()

type MeResponse = {
  profile: {
    id: string
    username: string
    display_name: string | null
    about: string | null
    avatar_url: string | null
    role: 'visitor' | 'photographer' | 'admin'
    moderation_status: 'pending' | 'approved' | 'suspended'
    profile_tags?: { tag_slug: string }[]
  } | null
  stats: {
    publicPhotoCount: number
    tagCount: number
  }
}

type TagItem = { slug: string, label: string }

type ThreadItem = {
  id: string
  quote_request?: { status: string, category: string, budget: string | null, timeline: string | null } | null
  photographer?: { username: string, display_name: string | null, avatar_url: string | null } | null
}

type ThreadsResponse = { items: ThreadItem[] }

const { data: me, refresh: refreshMe } = await useFetch<MeResponse>('/api/me/profile')
const { data: threads, pending: threadsPending, refresh: refreshThreads } = await useFetch<ThreadsResponse>('/api/me/threads')
const { data: tagsData } = await useFetch<{ items: TagItem[] }>('/api/tags')

const saving = ref(false)
const selectedTags = ref<string[]>([])
const profileDraft = reactive({
  display_name: '',
  about: '',
  avatar_url: '' as string | null
})

watchEffect(() => {
  if (me.value?.profile) {
    profileDraft.display_name = me.value.profile.display_name ?? ''
    profileDraft.about = me.value.profile.about ?? ''
    profileDraft.avatar_url = me.value.profile.avatar_url ?? null
    selectedTags.value = (me.value.profile.profile_tags || []).map(tag => tag.tag_slug)
  }
})

const availableTags = computed(() => tagsData.value?.items || [])

const completionChecks = computed(() => {
  const photoCount = me.value?.stats.publicPhotoCount ?? 0
  const tagCount = selectedTags.value.length
  const aboutLength = profileDraft.about.trim().length
  return [
    {
      id: 'avatar',
      label: 'Upload a profile avatar',
      done: Boolean(profileDraft.avatar_url || me.value?.profile?.avatar_url)
    },
    {
      id: 'display_name',
      label: 'Set your public display name',
      done: profileDraft.display_name.trim().length >= 2
    },
    {
      id: 'about',
      label: 'Write a clear bio (at least 80 chars)',
      done: aboutLength >= 80
    },
    {
      id: 'tags',
      label: 'Add at least 3 specialty tags',
      done: tagCount >= 3
    },
    {
      id: 'portfolio',
      label: 'Publish at least 6 portfolio photos',
      done: photoCount >= 6
    }
  ]
})

const completionPercent = computed(() => {
  if (!completionChecks.value.length) return 0
  const completed = completionChecks.value.filter(item => item.done).length
  return Math.round((completed / completionChecks.value.length) * 100)
})

const discoverabilityTips = computed(() => {
  const checks = completionChecks.value
  const tips: string[] = []
  if (!checks.find(item => item.id === 'avatar')?.done) {
    tips.push('Profiles with a recognizable avatar feel more trustworthy.')
  }
  if (!checks.find(item => item.id === 'about')?.done) {
    tips.push('Mention your style, location, and preferred shoots in your bio.')
  }
  if (!checks.find(item => item.id === 'tags')?.done) {
    tips.push('Add specialty tags clients search for, like wedding or portrait.')
  }
  if (!checks.find(item => item.id === 'portfolio')?.done) {
    tips.push('Upload more public samples to improve conversion on profile visits.')
  }
  return tips
})

function toggleTag(slug: string) {
  if (selectedTags.value.includes(slug)) {
    selectedTags.value = selectedTags.value.filter(item => item !== slug)
    return
  }

  if (selectedTags.value.length >= 12) {
    toast.add({ title: 'Tag limit reached', description: 'Use up to 12 specialty tags.', color: 'warning' })
    return
  }

  selectedTags.value = [...selectedTags.value, slug]
}

async function saveProfile() {
  saving.value = true
  try {
    await $fetch('/api/me/profile', {
      method: 'PATCH',
      body: {
        display_name: profileDraft.display_name || null,
        about: profileDraft.about || null,
        avatar_url: profileDraft.avatar_url || null,
        tags: selectedTags.value
      }
    })
    toast.add({ title: 'Profile saved' })
    await refreshMe()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.message ?? String(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function onPickAvatar(files: FileList | null) {
  const file = files?.[0]
  if (!file) return
  if (!user.value?.id) {
    toast.add({ title: 'Upload failed', description: 'Please sign in again.', color: 'error' })
    return
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.value.id}/avatar/${crypto.randomUUID()}.${ext}`

  try {
    const { error } = await supabase.storage.from('portfolio').upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    })
    if (error) throw error
    profileDraft.avatar_url = path
    toast.add({ title: 'Avatar uploaded', description: 'Save profile to apply.' })
  } catch (e: any) {
    toast.add({ title: 'Avatar upload failed', description: e?.message ?? String(e), color: 'error' })
  }
}
</script>

<template>
  <UPage>
    <UPageHeader title="Dashboard" description="Manage your profile and conversations." />

    <UPageBody class="space-y-8">
      <UCard v-if="me?.profile" class="space-y-5">
        <UCard class="space-y-4" variant="soft">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm uppercase tracking-wide text-muted">Profile completion</p>
              <p class="text-2xl font-semibold">{{ completionPercent }}%</p>
            </div>
            <UBadge :color="completionPercent === 100 ? 'success' : 'warning'" variant="soft" size="lg">
              {{ completionChecks.filter(item => item.done).length }}/{{ completionChecks.length }} complete
            </UBadge>
          </div>

          <UProgress :model-value="completionPercent" />

          <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
            <UAlert
              v-for="item in completionChecks"
              :key="item.id"
              :color="item.done ? 'success' : 'neutral'"
              :icon="item.done ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
              variant="soft"
              :title="item.label"
            />
          </div>

          <UAlert
            v-for="tip in discoverabilityTips"
            :key="tip"
            color="info"
            variant="subtle"
            icon="i-lucide-lightbulb"
            :title="tip"
          />

          <div class="flex flex-wrap gap-2">
            <UButton to="/dashboard/portfolio" size="sm" color="primary" variant="soft" icon="i-lucide-images">
              Manage portfolio
            </UButton>
            <UButton :to="`/${me.profile.username}`" size="sm" color="neutral" variant="outline" icon="i-lucide-external-link">
              View public profile
            </UButton>
          </div>
        </UCard>

        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <UAvatar
              :src="portfolioImage(profileDraft.avatar_url || me.profile.avatar_url, 'avatar') || undefined"
              :alt="me.profile.username"
              size="xl"
            />
            <div>
              <p class="font-semibold">{{ me.profile.display_name || me.profile.username }}</p>
              <p class="text-sm text-muted">@{{ me.profile.username }} • {{ me.profile.role }} • {{ me.profile.moderation_status }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="outline" icon="i-lucide-image-up">
              <label class="cursor-pointer">
                <input type="file" accept="image/*" class="hidden" @change="(e: any) => onPickAvatar(e.target.files)">
                Upload photo
              </label>
            </UButton>
            <UButton :to="`/${me.profile.username}`" color="neutral" variant="outline" icon="i-lucide-external-link">
              Public profile
            </UButton>
          </div>
        </div>

        <UAlert v-if="me.profile.role === 'photographer' && me.profile.moderation_status !== 'approved'" color="warning" variant="soft" title="Pending moderation">
          Your profile is not public yet. An admin must approve it.
        </UAlert>

        <UForm :state="profileDraft" @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Display name">
              <UInput v-model="profileDraft.display_name" placeholder="Your studio name" />
            </UFormField>
            <div />
            <UFormField class="md:col-span-2" label="About me">
              <UTextarea v-model="profileDraft.about" :rows="4" placeholder="Tell clients who you are, what you shoot, and where you are based." />
            </UFormField>

            <UFormField class="md:col-span-2" label="Specialty tags">
              <div class="space-y-3">
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="tagItem in availableTags"
                    :key="tagItem.slug"
                    :color="selectedTags.includes(tagItem.slug) ? 'primary' : 'neutral'"
                    :variant="selectedTags.includes(tagItem.slug) ? 'soft' : 'outline'"
                    size="xs"
                    @click="toggleTag(tagItem.slug)"
                  >
                    {{ tagItem.slug }}
                  </UButton>
                </div>
                <p class="text-xs text-muted">
                  Selected: {{ selectedTags.length }} / 12
                </p>
              </div>
            </UFormField>
          </div>
          <div class="mt-5 flex items-center justify-end border-t border-default/60 pt-4">
            <UButton type="submit" color="primary" :loading="saving">Save profile</UButton>
          </div>
        </UForm>
      </UCard>

      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Threads</h2>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="threadsPending" @click="refreshThreads()">
          Refresh
        </UButton>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UCard v-for="t in threads?.items || []" :key="t.id" class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold truncate">
                {{ t.quote_request?.category || 'Quote' }}
              </p>
              <p class="text-sm text-muted truncate">
                Status: {{ t.quote_request?.status || '—' }}
              </p>
            </div>
            <UButton :to="`/dashboard/threads/${t.id}`" size="sm" color="primary" variant="soft">
              Open
            </UButton>
          </div>
          <div class="text-sm text-muted">
            Photographer:
            <span class="font-medium">{{ t.photographer?.display_name || t.photographer?.username || '—' }}</span>
          </div>
        </UCard>
      </div>
    </UPageBody>
  </UPage>
</template>

