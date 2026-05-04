// Redirect alias — emotion profile and memory management moved to /admin/dashboard/memory.
// Includes consent and privacy controls for user data.
import { redirect } from 'next/navigation'

export default function MemoryEmotionsPage() {
  redirect('/admin/dashboard/memory')
}
