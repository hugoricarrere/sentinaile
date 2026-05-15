export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

interface SubRecord { subscription: PushSubscriptionJSON; spotId: string; minScore: number }
const subscriptions = new Map<string, SubRecord>()

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json() as Partial<SubRecord>
  if (!body.subscription || !body.spotId || typeof body.minScore !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const key = JSON.stringify(body.subscription.keys)
  subscriptions.set(key, { subscription: body.subscription, spotId: body.spotId, minScore: body.minScore })
  return NextResponse.json({ ok: true })
}
