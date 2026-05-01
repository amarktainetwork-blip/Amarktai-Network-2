import { redirect } from 'next/navigation'

/** Events log consolidated into System Health. */
export default function EventsPage() {
  redirect('/admin/dashboard/system-health')
}
