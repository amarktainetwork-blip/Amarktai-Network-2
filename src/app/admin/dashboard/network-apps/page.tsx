/**
 * Network Apps / Connected Apps redirect.
 *
 * The canonical connected apps page is at /admin/dashboard/connected-apps.
 * This page redirects there to avoid a dead end.
 */

import { redirect } from 'next/navigation'

export default function NetworkAppsPage() {
  redirect('/admin/dashboard/connected-apps')
}
