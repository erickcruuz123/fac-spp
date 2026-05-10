// src/routes/admin.ts — rotas protegidas por senha admin

import type { Env } from '../types';
import { SupabaseClient } from '../supabase';
import { ok, err, gerarCS } from '../helpers';

// Verifica senha admin no header Authorization
export function checkAdmin(req: Request, env: Env): boolean {
  const auth = req.headers.get('Authorization');
  if (!auth) return false;
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer') return false;
  return token === env.ADMIN_PASSWORD;
}

// POST /api/admin/login
export async function adminLogin(req: Request, env: Env): Promise<Response> {
  const { password } = await req.json() as { password: string };
  if (password === env.ADMIN_PASSWORD) {
    return ok({ token: env.ADMIN_PASSWORD }, env);
  }
  return err('Senha incorreta', env, 401);
}

// GET /api/admin/fichas
export async function listarFichas(req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return err('Não autorizado', env, 401);

  const url = new URL(req.url);
  const fac = url.searchParams.get('fac');
  const status = url.searchParams.get('status');

  let query = 'select=id,numero_ficha,fac_numero,nome_completo,cpf,contra_senha,nucleo,preenchida,status_autorizacao,data_acampamento,criado_em&order=fac_numero.asc,numero_ficha.asc';
  if (fac) query += `&fac_numero=eq.${fac}`;
  if (status === 'preenchida') query += '&preenchida=eq.true';
  if (status === 'pendente') query += '&preenchida=eq.false';

  const db = new SupabaseClient(env);
  const fichas = await db.select('fichas', query);
  return ok(fichas, env);
}

// GET /api/admin/ficha/:id
export async function getFicha(fichaId: string, req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return err('Não autorizado', env, 401);

  const db = new SupabaseClient(env);
  const [ficha, respostas, doc] = await Promise.all([
    db.selectOne('fichas', `id=eq.${fichaId}&select=*`),
    db.select('respostas', `ficha_id=eq.${fichaId}&select=campo_id,valor`),
    db.selectOne('documentos_responsavel', `ficha_id=eq.${fichaId}&select=*`),
  ]);

  if (!ficha) return err('Ficha não encontrada', env, 404);
  return ok({ ficha, respostas, documento: doc }, env);
}

// DELETE /api/admin/ficha/:id
export async function excluirFicha(fichaId: string, req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return err('Não autorizado', env, 401);

  const db = new SupabaseClient(env);
  await Promise.all([
    db.delete('respostas', `ficha_id=eq.${fichaId}`),
    db.delete('documentos_responsavel', `ficha_id=eq.${fichaId}`),
  ]);
  await db.delete('fichas', `id=eq.${fichaId}`);

  return ok({ message: 'Ficha excluída' }, env);
}

// POST /api/admin/gerar-lote
export async function gerarLote(req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return err('Não autorizado', env, 401);

  const { fac_numero, data_acampamento, nucleo, quantidade, inicio } = await req.json() as {
    fac_numero: number;
    data_acampamento: string;
    nucleo?: string;
    quantidade: number;
    inicio?: number;
  };

  if (!fac_numero || !data_acampamento || !quantidade) {
    return err('fac_numero, data_acampamento e quantidade são obrigatórios', env);
  }
  if (quantidade < 1 || quantidade > 200) {
    return err('Quantidade deve ser entre 1 e 200', env);
  }

  const startNum = inicio ?? 1;
  const lote = Array.from({ length: quantidade }, (_, i) => ({
    numero_ficha: `FAC${fac_numero}-${String(startNum + i).padStart(3, '0')}`,
    contra_senha: gerarCS(),
    fac_numero,
    data_acampamento,
    nucleo: nucleo ?? null,
    preenchida: false,
    nome_completo: null,
    cpf: null,
    data_nascimento: null,
    sexo: null,
    emergencia_nome: null,
    emergencia_parentesco: null,
    emergencia_telefone: null,
    declaracao_aceita: false,
    nome_assinatura: null,
  }));

  const db = new SupabaseClient(env);
  try {
    await db.insert('fichas', lote);
    return ok({ message: `${quantidade} fichas criadas`, lote }, env, 201);
  } catch (e: unknown) {
    const error = e as Error & { code?: string };
    if (error.code === '23505') {
      return err('Fichas duplicadas. Altere o número inicial.', env, 409);
    }
    throw e;
  }
}

// GET /api/admin/form-config
export async function getFormConfigAdmin(req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return err('Não autorizado', env, 401);

  const db = new SupabaseClient(env);
  const config = await db.selectOne('form_config', 'order=atualizado_em.desc');
  return ok(config, env);
}

// POST /api/admin/form-config
export async function saveFormConfig(req: Request, env: Env): Promise<Response> {
  if (!checkAdmin(req, env)) return err('Não autorizado', env, 401);

  const { id, config } = await req.json() as { id?: string; config: object };
  const db = new SupabaseClient(env);

  if (id) {
    await db.patch('form_config', `id=eq.${id}`, {
      config,
      atualizado_em: new Date().toISOString(),
    });
    return ok({ message: 'Configuração atualizada' }, env);
  } else {
    const result = await db.insert<{ id: string }>('form_config', { config });
    return ok({ message: 'Configuração salva', id: result[0]?.id }, env, 201);
  }
}
