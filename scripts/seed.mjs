import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in environment.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function ensureTag(slug, label) {
  await supabase.from('tags').upsert({ slug, label })
}

async function createUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (error) throw error
  return data.user
}

async function upsertProfile({ userId, username, displayName, role, moderationStatus, about }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      username,
      display_name: displayName,
      role,
      moderation_status: moderationStatus,
      about
    })
    .select('id,username')
    .single()
  if (error) throw error
  return data
}

async function main() {
  console.log('Seeding…')

  await ensureTag('wedding', 'Wedding')
  await ensureTag('portrait', 'Portrait')
  await ensureTag('event', 'Event')

  const adminEmail = 'admin@example.com'
  const adminPass = 'AdminPass123!'
  const p1Email = 'sara@example.com'
  const p1Pass = 'PhotogPass123!'
  const p2Email = 'omar@example.com'
  const p2Pass = 'PhotogPass123!'
  const clientEmail = 'client@example.com'
  const clientPass = 'ClientPass123!'

  const admin = await createUser(adminEmail, adminPass)
  const p1 = await createUser(p1Email, p1Pass)
  const p2 = await createUser(p2Email, p2Pass)
  await createUser(clientEmail, clientPass)

  const adminProfile = await upsertProfile({
    userId: admin.id,
    username: 'admin',
    displayName: 'Platform Admin',
    role: 'admin',
    moderationStatus: 'approved',
    about: 'Admin account'
  })

  const saraProfile = await upsertProfile({
    userId: p1.id,
    username: 'sara_shoots',
    displayName: 'Sara Studio',
    role: 'photographer',
    moderationStatus: 'approved',
    about: 'Wedding + portrait photographer.'
  })

  const omarProfile = await upsertProfile({
    userId: p2.id,
    username: 'omar_frames',
    displayName: 'Omar Frames',
    role: 'photographer',
    moderationStatus: 'approved',
    about: 'Lifestyle and events.'
  })

  await supabase.from('profile_tags').upsert([
    { profile_id: saraProfile.id, tag_slug: 'wedding' },
    { profile_id: saraProfile.id, tag_slug: 'portrait' },
    { profile_id: omarProfile.id, tag_slug: 'event' }
  ])

  await supabase.from('photos').insert([
    {
      profile_id: saraProfile.id,
      title: 'Bride & Groom',
      description: 'Seed photo (upload to portfolio bucket to see image).',
      event_type: 'wedding',
      image_path: 'seed/sara-1.jpg',
      visibility: 'public',
      is_featured: true
    },
    {
      profile_id: omarProfile.id,
      title: 'Golden hour',
      description: 'Seed photo (upload to portfolio bucket to see image).',
      event_type: 'event',
      image_path: 'seed/omar-1.jpg',
      visibility: 'public',
      is_featured: false
    }
  ])

  console.log('Done.')
  console.log('')
  console.log('Accounts:')
  console.log(`- admin:  ${adminEmail} / ${adminPass} (username: ${adminProfile.username})`)
  console.log(`- photog: ${p1Email} / ${p1Pass} (username: ${saraProfile.username})`)
  console.log(`- photog: ${p2Email} / ${p2Pass} (username: ${omarProfile.username})`)
  console.log(`- client: ${clientEmail} / ${clientPass}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

