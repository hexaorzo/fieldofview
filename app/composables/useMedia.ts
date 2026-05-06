export function useMedia() {
  const supabase = useSupabase()

  type Transform = {
    width?: number
    height?: number
    quality?: number
    resize?: 'cover' | 'contain' | 'fill'
  }

  function publicUrl(bucket: string, path: string | null, transform?: Transform) {
    if (!path) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, transform ? { transform } : undefined)
    return data.publicUrl
  }

  function mediaUrl(pathOrUrl: string | null, bucket = 'portfolio', transform?: Transform) {
    if (!pathOrUrl) return null
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
    return publicUrl(bucket, pathOrUrl, transform)
  }

  function portfolioImage(pathOrUrl: string | null, variant: 'thumb' | 'card' | 'masonry' | 'full' | 'avatar' = 'card') {
    const transforms: Record<typeof variant, Transform> = {
      thumb: { width: 360, height: 270, resize: 'cover', quality: 70 },
      card: { width: 900, height: 675, resize: 'cover', quality: 78 },
      masonry: { width: 1200, quality: 78 },
      full: { width: 1800, quality: 84 },
      avatar: { width: 240, height: 240, resize: 'cover', quality: 78 }
    }

    return mediaUrl(pathOrUrl, 'portfolio', transforms[variant])
  }

  return { publicUrl, mediaUrl, portfolioImage }
}

