import { redirect } from 'next/navigation'

/** Integrations setup consolidated into Settings. */
export default function IntegrationsPage() {
  redirect('/admin/dashboard/settings')
}
