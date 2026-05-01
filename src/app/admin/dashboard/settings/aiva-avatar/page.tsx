import { redirect } from 'next/navigation'

/** Aiva avatar setup hidden — Aiva is disabled. Redirect to Settings. */
export default function AivaAvatarPage() {
  redirect('/admin/dashboard/settings')
}
