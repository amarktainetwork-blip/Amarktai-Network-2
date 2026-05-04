import { redirect } from 'next/navigation'

/** Events log consolidated into Diagnostics. */
export default function EventsPage() {
  redirect('/admin/dashboard/diagnostics')
}
