import { redirect } from 'next/navigation'
/** System hub route kept for backward compatibility — redirects to Diagnostics. */
export default function SystemHubRedirectPage() {
  redirect('/admin/dashboard/diagnostics')
}
