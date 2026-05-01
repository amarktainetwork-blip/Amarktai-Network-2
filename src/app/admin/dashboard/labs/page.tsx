import { redirect } from 'next/navigation'
/** Labs route kept for backward compatibility — redirects to Repo Workbench. */
export default function LabsRedirectPage() {
  redirect('/admin/dashboard/repo-workbench')
}
