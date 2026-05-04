import { redirect } from 'next/navigation'

/** Emotions route — canonical section is now Memory / Emotions. */
export default function EmotionsPage() {
  redirect('/admin/dashboard/memory-emotions')
}
