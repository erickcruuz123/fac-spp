// src/routes/waha.ts — webhook que recebe mensagens do WhatsApp via Waha

import type { Env } from '../types';
import { SupabaseClient } from '../supabase';
import { ok, fmtTelWhats } from '../helpers';

async function sendMsg(env: Env, phone: string, text: string): Promise<void> {
  await fetch(`${env.WAHA_URL}/api/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: env.WAHA_SESSION,
      chatId: fmtTelWhats(phone),
      text,
    }),
  }).catch(() => {});
}

// POST /api/waha/webhook
export async function wahaWebhook(req: Request, env: Env): Promise<Response> {
  // Verificar secret do webhook
  const secret = req.headers.get('X-Webhook-Secret');
  if (env.WAHA_WEBHOOK_SECRET && secret !== env.WAHA_WEBHOOK_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return ok('ignored', env);

  // Waha envia: { event: 'message', payload: { from, body } }
  if (body.event !== 'message') return ok('ignored', env);

  const from: string = (body.payload?.from ?? '').replace('@c.us', '').replace(/\D/g, '');
  const text: string = (body.payload?.body ?? '').trim();

  if (!from || !text) return ok('ignored', env);

  const db = new SupabaseClient(env);

  // Buscar ficha aguardando autorização deste responsável
  const fichas = await db.select<{
    id: string;
    nome_completo: string;
    numero_ficha: string;
    fac_numero: number;
    telefone_jovem: string | null;
  }>(
    'fichas',
    `telefone_responsavel=eq.${from}&status_autorizacao=eq.aguardando&select=id,nome_completo,numero_ficha,fac_numero,telefone_jovem`
  );

  if (!fichas.length) return ok('no_pending', env);

  const ficha = fichas[0];

  if (text === '1') {
    // ✅ Autorizado
    await db.patch('fichas', `id=eq.${ficha.id}`, {
      status_autorizacao: 'autorizada',
      data_autorizacao: new Date().toISOString(),
    });

    await sendMsg(env, from,
      `✅ Autorização confirmada!\n\nA inscrição de *${ficha.nome_completo}* no Acampamento São Padre Pio - FAC ${ficha.fac_numero} foi *autorizada*.\n\nQue Deus abençoe! 🙏`
    );

    if (ficha.telefone_jovem) {
      await sendMsg(env, ficha.telefone_jovem,
        `🎉 Sua inscrição no *Acampamento São Padre Pio* foi *confirmada* pelo seu responsável!\n\nFicha: *${ficha.numero_ficha}*\nGuarde este número para referência.\n\nQue Deus abençoe sua caminhada! 🙏`
      );
    }

  } else if (text === '2') {
    // ❌ Recusado
    await db.patch('fichas', `id=eq.${ficha.id}`, {
      status_autorizacao: 'recusada',
      data_autorizacao: new Date().toISOString(),
    });

    await sendMsg(env, from,
      `❌ Você recusou a inscrição de *${ficha.nome_completo}*.\n\nSe foi um engano, entre em contato com seu núcleo.`
    );

    if (ficha.telefone_jovem) {
      await sendMsg(env, ficha.telefone_jovem,
        `❌ Sua inscrição no *Acampamento São Padre Pio* foi *recusada* pelo seu responsável.\n\nFicha: *${ficha.numero_ficha}*\nEntre em contato com seu núcleo para mais informações.`
      );
    }

  } else {
    // Resposta inválida
    await sendMsg(env, from,
      `Por favor, responda apenas:\n*1* para AUTORIZAR\n*2* para RECUSAR\n\na inscrição de *${ficha.nome_completo}* no Acampamento São Padre Pio.`
    );
  }

  return ok('processed', env);
}
