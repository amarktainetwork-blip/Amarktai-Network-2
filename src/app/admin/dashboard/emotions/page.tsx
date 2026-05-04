import { redirect } from 'next/navigation'

/** Emotions route — canonical section is now Memory. */
export default function EmotionsPage() {
  redirect('/admin/dashboard/memory')
}
