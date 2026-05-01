import { redirect } from 'next/navigation'

/** Access control page consolidated into Settings. */
export default function AccessPage() {
  redirect('/admin/dashboard/settings')
}
