import { redirect } from 'next/navigation'
export default function ReadinessPage() {
  redirect('/admin/dashboard/diagnostics')
}
