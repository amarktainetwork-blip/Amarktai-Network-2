import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { AIVA_ACTION_PERMISSIONS } from '@/lib/aiva-action-permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const byCategory = AIVA_ACTION_PERMISSIONS.reduce<Record<string, typeof AIVA_ACTION_PERMISSIONS[number][]>>((acc, permission) => {
    acc[permission.category] ??= []
    acc[permission.category].push(permission)
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    actions: AIVA_ACTION_PERMISSIONS,
    byCategory,
    rules: {
      fullControlIsToolGated: true,
      destructiveActionsRequireConfirmation: true,
      externalWritesRequireConfirmation: true,
      deploysRequireConfirmation: true,
      spendRequiresConfirmation: true,
    },
  })
}
