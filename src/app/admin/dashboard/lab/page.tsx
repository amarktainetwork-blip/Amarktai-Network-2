import { redirect } from 'next/navigation'
/** Lab route kept for backward compatibility — redirects to Repo Workbench. */
export default function LabRedirectPage() {
  redirect('/admin/dashboard/repo-workbench')
}
