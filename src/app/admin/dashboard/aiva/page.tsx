// Redirect alias — conversation interface moved to /admin/dashboard/amarktai-assistant.
// Status: Ready to wire — assistant chat backend is at /api/admin/amarktai-assistant/chat.
import { redirect } from 'next/navigation'

export default function AivaChatPage() {
  redirect('/admin/dashboard/amarktai-assistant')
}
