export const SONG_GENRES = [
  'reggae', 'rasta/reggae', 'pop', 'rock', 'soft rock', 'hard rock', 'acoustic',
  'afrobeat', 'amapiano', 'gospel', 'rap', 'hip hop', 'R&B', 'soul', 'jazz',
  'blues', 'country', 'folk', 'EDM', 'house', 'deep house', 'techno', 'trance',
  'cinematic', 'orchestral', 'ambient', 'lo-fi', 'dancehall', 'ska', 'latin',
  'salsa', 'k-pop', 'worship', 'indie', 'punk', 'metal',
] as const

export const SONG_DURATIONS = [
  { value: '30', label: '30 seconds' },
  { value: '60', label: '60 seconds' },
  { value: '90', label: '90 seconds' },
  { value: '120', label: '2 minutes' },
  { value: '180', label: '3 minutes' },
  { value: 'custom', label: 'Custom' },
] as const

export const SONG_VOCALS = ['male', 'female', 'duet', 'group', 'choir', 'instrumental'] as const
export const SONG_MOODS = ['uplifting', 'calm', 'energetic', 'romantic', 'hopeful', 'reflective', 'dark', 'dramatic', 'celebratory', 'spiritual'] as const
export const SONG_LANGUAGES = ['English', 'Afrikaans', 'Zulu', 'Xhosa', 'Spanish', 'French', 'Portuguese', 'German', 'Italian', 'Japanese', 'Korean', 'Instrumental'] as const
export const SONG_STRUCTURES = ['auto', 'intro/verse/chorus/bridge/outro', 'verse/chorus', 'instrumental'] as const

export const AVATAR_STYLES = [
  'professional presenter', 'friendly assistant', 'futuristic operator', 'realistic human',
  'animated character', 'brand mascot', 'business spokesperson', 'explainer host',
  'educator', 'sales presenter', 'support agent', 'music performer', 'news anchor',
  'fitness coach', 'product demo host', 'custom uploaded image', 'generated image',
  'brand character',
] as const

export const VOICE_STYLES = [
  'male calm', 'female calm', 'male energetic', 'female energetic', 'narrator',
  'presenter', 'radio host', 'sales voice', 'support voice', 'warm assistant',
  'authoritative', 'emotional', 'dramatic', 'youthful', 'mature',
  'South African English', 'British English', 'American English', 'neutral English',
  'custom uploaded voice',
] as const

export const MOVIE_STYLES = [
  'cinematic', 'product demo', 'documentary', 'social ad', 'explainer', 'futuristic',
  'realistic', 'animated', 'corporate', 'luxury', 'tech', 'music video',
  'vertical short', 'YouTube intro', 'training video', 'app promo', 'brand story',
] as const

export const IMAGE_STYLES = [
  'photorealistic', 'cinematic', 'product render', '3D', 'vector', 'illustration',
  'luxury brand', 'dark tech', 'glassmorphism', 'social ad', 'poster', 'logo concept',
  'dashboard mockup', 'app screen', 'avatar portrait',
] as const

export const RESEARCH_DEPTHS = ['quick scan', 'standard research', 'deep research', 'source audit'] as const

export type StudioCommandOptions = {
  duration?: string
  genres?: string[]
  combineGenres?: boolean
  vocals?: string
  mood?: string
  language?: string
  cleanLyrics?: boolean
  structure?: string
  avatarStyle?: string
  voiceStyle?: string
  movieStyle?: string
  imageStyle?: string
  researchDepth?: string
  costMode?: string
}

const GENRE_ALIASES: Array<[string, string]> = [
  ['rasta', 'rasta/reggae'],
  ['hip-hop', 'hip hop'],
  ['hiphop', 'hip hop'],
  ['r&b', 'R&B'],
  ['rhythm and blues', 'R&B'],
  ['lofi', 'lo-fi'],
  ['kpop', 'k-pop'],
]

export function extractStudioOptions(prompt: string, selected: StudioCommandOptions = {}): StudioCommandOptions {
  const normalized = prompt.toLowerCase()
  const genres = SONG_GENRES.filter((genre) => normalized.includes(genre.toLowerCase())) as string[]
  for (const [alias, genre] of GENRE_ALIASES) {
    if (normalized.includes(alias) && !genres.includes(genre)) genres.push(genre)
  }

  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)[\s-]*(?:minute|min)\b/)
  const secondMatch = normalized.match(/(\d+)[\s-]*(?:second|sec)\b/)
  const duration = minuteMatch ? String(Math.round(Number(minuteMatch[1]) * 60)) : secondMatch?.[1]

  return {
    ...selected,
    duration: duration ?? selected.duration,
    genres: genres.length ? genres : selected.genres,
    combineGenres: genres.length > 1 || selected.combineGenres,
  }
}
