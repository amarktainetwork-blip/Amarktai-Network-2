import { redirect } from 'next/navigation'
/** System hub route kept for backward compatibility — redirects to System Health. */
export default function SystemHubRedirectPage() {
  redirect('/admin/dashboard/system-health')
}
