import { redirect } from 'next/navigation'

/** Deployments consolidated into Repo Workbench. */
export default function DeploymentsPage() {
  redirect('/admin/dashboard/repo-workbench')
}
