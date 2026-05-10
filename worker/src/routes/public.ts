// src/routes/public.ts — rotas públicas (sem autenticação admin)

import type { Env, Resposta, DocumentoResponsavel } from '../types';
import { SupabaseClient } from '../supabase';
import { ok, err, fmtTelWhats } from '../helpers';

// GET /api/form-config
export async function getFormConfig(env: Env): Promise<Response> {
  const db = new SupabaseClient(env);
  const config = await db.selectOne('form_config', 'order=atualizado_em.desc');
  return ok(config, env);
}

// POST /api/validar-ficha
export async function validarFicha(req: Request, env: Env): Promise<Response> {
  const { numero_ficha, contra_senha } = await req.json() as {
    numero_ficha: string;
    contra_senha: string;
  };

  if (!numero_ficha || !contra_senha) {
    return err('Número e contra-senha são obrigatórios', env);
  }

  const db = new SupabaseClient(env);
  const ficha = await db.selectOne(
    'fichas',
    `numero_ficha=eq.${encodeURIComponent(numero_ficha.toUpperCase())}&contra_senha=eq.${encodeURIComponent(contra_senha.toUpperCase())}&select=id,numero_ficha,fac_numero,data_acampamento,preenchida,nucleo`
  );

  if (!ficha) return err('Número de ficha ou contra-senha inválidos', env, 404);

  const f = ficha as { preenchida: boolean };
  if (f.preenchida) return err('Esta ficha já foi preenchida', env, 409);

  return ok(ficha, env);
}

// POST /api/enviar-ficha
export async function enviarFicha(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as {
    ficha_id: string;
    respostas: Record<string, string>;
    responsavel: {
      nome: string;
      cpf: string;
      parentesco: string;
      telefone: string;
      assinatura_base64: string;
      documento_base64: string | null;
      documento_tipo: string | null;
    };
    declaracao_aceita: boolean;
    nome_assinatura: string;
    telefone_jovem?: string;
    nome_completo?: string;
    cpf?: string;
  };

  const { ficha_id, respostas, responsavel, declaracao_aceita, nome_assinatura } = body;

  if (!ficha_id || !nome_assinatura || !declaracao_aceita) {
    return err('Dados incompletos', env);
  }

  const db = new SupabaseClient(env);

  // 1. Atualizar ficha como preenchida
  await db.patch('fichas', `id=eq.${ficha_id}`, {
    preenchida: true,
    declaracao_aceita: true,
    nome_assinatura,
    data_assinatura: new Date().toISOString(),
    nome_completo: body.nome_completo ?? null,
    cpf: body.cpf ?? null,
    telefone_responsavel: responsavel.telefone.replace(/\D/g, ''),
    telefone_jovem: body.telefone_jovem?.replace(/\D/g, '') ?? null,
    status_autorizacao: 'aguardando',
  });

  // 2. Salvar respostas dinâmicas
  if (Object.keys(respostas).length > 0) {
    const rows: Resposta[] = Object.entries(respostas).map(([campo_id, valor]) => ({
      ficha_id,
      campo_id,
      valor: String(valor),
    }));
    await db.insert('respostas', rows);
  }

  // 3. Salvar documento do responsável
  const docPayload: DocumentoResponsavel = {
    ficha_id,
    nome_responsavel: responsavel.nome,
    cpf_responsavel: responsavel.cpf,
    parentesco: responsavel.parentesco,
    assinatura_nome: responsavel.assinatura_base64,
    documento_base64: responsavel.documento_base64,
    documento_tipo: responsavel.documento_tipo,
  };
  await db.insert('documentos_responsavel', docPayload);

  // 4. Enviar WhatsApp para o responsável (se Waha configurado)
  if (env.WAHA_URL && responsavel.telefone) {
    const ficha = await db.selectOne<{
      numero_ficha: string;
      fac_numero: number;
    }>('fichas', `id=eq.${ficha_id}&select=numero_ficha,fac_numero`);

    if (ficha) {
      const nome = body.nome_completo ?? 'o acampante';
      const msg =
        `Olá! *${nome}* realizou a inscrição no ` +
        `*Acampamento São Padre Pio - FAC ${ficha.fac_numero}*.\n\n` +
        `Ficha: *${ficha.numero_ficha}*\n\n` +
        `Para *AUTORIZAR* a participação, responda: *1*\n` +
        `Para *RECUSAR*, responda: *2*\n\n` +
        `Arquidiocese de Florianópolis 🙏`;

      await fetch(`${env.WAHA_URL}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: env.WAHA_SESSION,
          chatId: fmtTelWhats(responsavel.telefone),
          text: msg,
        }),
      }).catch(() => {}); // não bloqueia se Waha offline
    }
  }

  return ok({ message: 'Ficha enviada com sucesso' }, env, 201);
}

// GET /api/consultar?numero=FAC12-001&cs=ABC-12345
export async function consultarFicha(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const numero = url.searchParams.get('numero')?.toUpperCase();
  const cs = url.searchParams.get('cs')?.toUpperCase();

  if (!numero || !cs) return err('Parâmetros obrigatórios: numero e cs', env);

  const db = new SupabaseClient(env);

  const [ficha, respostas, doc] = await Promise.all([
    db.selectOne('fichas', `numero_ficha=eq.${encodeURIComponent(numero)}&contra_senha=eq.${encodeURIComponent(cs)}&select=*`),
    db.select('respostas', `ficha_id=eq.${(ficha as { id?: string } | null)?.id ?? 'x'}&select=campo_id,valor`).catch(() => []),
    db.selectOne('documentos_responsavel', `ficha_id=eq.${(ficha as { id?: string } | null)?.id ?? 'x'}&select=nome_responsavel,cpf_responsavel,parentesco,assinatura_nome,documento_base64`).catch(() => null),
  ]);

  if (!ficha) return err('Ficha não encontrada', env, 404);
  const f = ficha as { preenchida: boolean };
  if (!f.preenchida) return err('Ficha ainda não foi preenchida', env, 404);

  // Rebusca respostas e doc com o id correto
  const fichaTyped = ficha as { id: string };
  const [respostasOk, docOk] = await Promise.all([
    db.select('respostas', `ficha_id=eq.${fichaTyped.id}&select=campo_id,valor`),
    db.selectOne('documentos_responsavel', `ficha_id=eq.${fichaTyped.id}&select=nome_responsavel,cpf_responsavel,parentesco,assinatura_nome,documento_base64`),
  ]);

  return ok({ ficha, respostas: respostasOk, documento: docOk }, env);
}
