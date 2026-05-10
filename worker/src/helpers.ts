// src/helpers.ts — utilitários de resposta HTTP e CORS

import type { Env } from './types';

export function cors(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.FRONTEND_URL,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function ok<T>(data: T, env: Env, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) },
  });
}

export function err(message: string, env: Env, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) },
  });
}

export function preflight(env: Env): Response {
  return new Response(null, { status: 204, headers: cors(env) });
}

export function gerarCS(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cs = '';
  for (let i = 0; i < 3; i++) cs += chars[Math.floor(Math.random() * chars.length)];
  cs += '-';
  for (let i = 0; i < 5; i++) cs += chars[Math.floor(Math.random() * chars.length)];
  return cs;
}

export function fmtTelWhats(tel: string): string {
  const digits = tel.replace(/\D/g, '');
  return (digits.startsWith('55') ? digits : '55' + digits) + '@c.us';
}
