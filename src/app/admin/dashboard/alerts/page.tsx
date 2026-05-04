import { redirect } from 'next/navigation'
/** Alerts route — canonical section is now Actions. */
export default function AlertsPage() {
  redirect('/admin/dashboard/actions')
}
