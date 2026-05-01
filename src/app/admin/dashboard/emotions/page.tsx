import { redirect } from 'next/navigation'

/** Emotions monitoring consolidated into System Health. */
export default function EmotionsPage() {
  redirect('/admin/dashboard/system-health')
}
