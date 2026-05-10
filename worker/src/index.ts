// src/index.ts — roteador principal do Cloudflare Worker

import type { Env } from './types';
import { preflight, err } from './helpers';

// Rotas públicas
import { getFormConfig, validarFicha, enviarFicha, consultarFicha } from './routes/public';

// Rotas admin
import {
  adminLogin,
  listarFichas,
  getFicha,
  excluirFicha,
  gerarLote,
  getFormConfigAdmin,
  saveFormConfig,
} from './routes/admin';

// Webhook WhatsApp
import { wahaWebhook } from './routes/waha';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Preflight CORS
    if (method === 'OPTIONS') return preflight(env);

    try {
      // ── ROTAS PÚBLICAS ──────────────────────────────────

      // Configuração do formulário
      if (path === '/api/form-config' && method === 'GET') {
        return await getFormConfig(env);
      }

      // Validar acesso à ficha (número + contra-senha)
      if (path === '/api/validar-ficha' && method === 'POST') {
        return await validarFicha(request, env);
      }

      // Enviar ficha preenchida
      if (path === '/api/enviar-ficha' && method === 'POST') {
        return await enviarFicha(request, env);
      }

      // Consultar ficha por número + CS
      if (path === '/api/consultar' && method === 'GET') {
        return await consultarFicha(request, env);
      }

      // ── ROTAS ADMIN ──────────────────────────────────────

      // Login admin
      if (path === '/api/admin/login' && method === 'POST') {
        return await adminLogin(request, env);
      }

      // Listar fichas
      if (path === '/api/admin/fichas' && method === 'GET') {
        return await listarFichas(request, env);
      }

      // Gerar lote
      if (path === '/api/admin/gerar-lote' && method === 'POST') {
        return await gerarLote(request, env);
      }

      // Config do formulário (admin)
      if (path === '/api/admin/form-config') {
        if (method === 'GET') return await getFormConfigAdmin(request, env);
        if (method === 'POST') return await saveFormConfig(request, env);
      }

      // Ficha individual (GET e DELETE)
      const fichaMatch = path.match(/^\/api\/admin\/ficha\/([^/]+)$/);
      if (fichaMatch) {
        const fichaId = fichaMatch[1];
        if (method === 'GET') return await getFicha(fichaId, request, env);
        if (method === 'DELETE') return await excluirFicha(fichaId, request, env);
      }

      // ── WEBHOOK WHATSAPP ─────────────────────────────────

      if (path === '/api/waha/webhook' && method === 'POST') {
        return await wahaWebhook(request, env);
      }

      // 404
      return err('Rota não encontrada', env, 404);

    } catch (e: unknown) {
      console.error('Worker error:', e);
      const message = e instanceof Error ? e.message : 'Erro interno';
      return err(message, env, 500);
    }
  },
};
