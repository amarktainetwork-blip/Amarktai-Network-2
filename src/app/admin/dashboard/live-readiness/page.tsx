import { redirect } from 'next/navigation'

export default function LiveReadinessPage() {
  redirect('/admin/dashboard/diagnostics')
}
