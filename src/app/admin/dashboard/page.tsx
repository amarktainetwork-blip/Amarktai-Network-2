import { redirect } from 'next/navigation'

export default function DashboardOverviewRedirect() {
  redirect('/admin/dashboard/command-center')
}
