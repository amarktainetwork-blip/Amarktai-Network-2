import { redirect } from 'next/navigation'

/** AI Intelligence page — canonical section is now Scraping / Research. */
export default function IntelligencePage() {
  redirect('/admin/dashboard/research')
}
