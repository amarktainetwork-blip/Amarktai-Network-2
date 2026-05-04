import { redirect } from 'next/navigation'
/** Operations route — canonical section is now Actions. */
export default function OperationsPage() {
  redirect('/admin/dashboard/actions')
}
