// Clover Hosted Checkout calls this after each payment attempt.
//
//   POST /api/clover-webhook   header Clover-Signature: t=<unix time>,v1=<hex HMAC-SHA256>
//
// Clover already creates the order in the restaurant's Clover account, so nothing needs to be
// written anywhere; this endpoint checks the signature and logs the result (Vercel → Logs) so a paid
// or declined order can be traced. It is the place to add a text to the kitchen or a receipt later.
//
// Environment variables:
//   CLOVER_WEBHOOK_SECRET   the signing secret shown in Clover → Hosted Checkout → Webhook   (required)

import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 5 * 60; // refuse replays of old notifications

function verified(raw, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map((kv) => kv.trim().split('=')));
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > MAX_AGE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  if (!secret) {
    console.error('CLOVER_WEBHOOK_SECRET is not set');
    return new Response('not configured', { status: 500 });
  }
  const raw = await request.text();
  if (raw.length > 20000 || !verified(raw, request.headers.get('clover-signature'), secret)) {
    console.warn('Clover webhook with a bad or missing signature was refused');
    return new Response('bad signature', { status: 401 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  // Shape per Clover's docs: { Type: 'PAYMENT', Status: 'APPROVED' | 'DECLINED', Id: paymentId, Data: checkoutSessionId, Message, MerchantId }
  const { Type, Status, Id, Data, Message } = event;
  const log = Status === 'APPROVED' ? console.log : console.warn;
  log('Clover payment', Type, Status, `payment=${Id}`, `checkout=${Data}`, Message ?? '');
  return new Response('ok');
}
