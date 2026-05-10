// src/lib/api.ts
// Único ponto de contato com o Cloudflare Worker
// Nenhuma credencial do Supabase fica no frontend

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787';

function getAdminToken(): string | null {
  return sessionStorage.getItem('admin_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    const json = await res.json() as { ok: boolean; data?: T; error?: string };
    return json.ok
      ? { ok: true, data: json.data as T }
      : { ok: false, error: json.error ?? 'Erro desconhecido' };
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── PÚBLICAS ─────────────────────────────────────────────

export const api = {

  /** Carrega configuração do formulário dinâmico */
  getFormConfig: () =>
    request<import('./types').FormConfigData>('/api/form-config'),

  /** Valida número da ficha + contra-senha */
  validarFicha: (numero_ficha: string, contra_senha: string) =>
    request<import('./types').FichaResumo>('/api/validar-ficha', {
      method: 'POST',
      body: JSON.stringify({ numero_ficha, contra_senha }),
    }),

  /** Envia ficha preenchida com respostas e dados do responsável */
  enviarFicha: (payload: import('./types').EnviarFichaPayload) =>
    request<{ message: string }>('/api/enviar-ficha', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Consulta ficha por número + contra-senha */
  consultarFicha: (numero: string, cs: string) =>
    request<import('./types').FichaCompleta>(
      `/api/consultar?numero=${encodeURIComponent(numero)}&cs=${encodeURIComponent(cs)}`
    ),

  // ── ADMIN ───────────────────────────────────────────────

  /** Login admin — salva token na sessionStorage */
  adminLogin: async (password: string) => {
    const result = await request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (result.ok) sessionStorage.setItem('admin_token', result.data.token);
    return result;
  },

  adminLogout: () => sessionStorage.removeItem('admin_token'),

  isAdminLoggedIn: () => !!getAdminToken(),

  /** Lista fichas com filtros opcionais */
  listarFichas: (params?: { fac?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.fac) qs.set('fac', String(params.fac));
    if (params?.status) qs.set('status', params.status);
    return request<import('./types').FichaLista[]>(
      `/api/admin/fichas${qs.toString() ? '?' + qs : ''}`,
      { headers: authHeaders() }
    );
  },

  /** Detalhes de uma ficha (admin) */
  getFicha: (id: string) =>
    request<import('./types').FichaCompleta>(
      `/api/admin/ficha/${id}`,
      { headers: authHeaders() }
    ),

  /** Excluir ficha */
  excluirFicha: (id: string) =>
    request<{ message: string }>(`/api/admin/ficha/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  /** Gerar lote de fichas */
  gerarLote: (payload: import('./types').GerarLotePayload) =>
    request<{ message: string; lote: import('./types').LoteItem[] }>(
      '/api/admin/gerar-lote',
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    ),

  /** Buscar config do formulário (admin) */
  getFormConfigAdmin: () =>
    request<import('./types').FormConfigRecord>(
      '/api/admin/form-config',
      { headers: authHeaders() }
    ),

  /** Salvar config do formulário */
  saveFormConfig: (id: string | undefined, config: import('./types').FormConfigData) =>
    request<{ message: string; id?: string }>(
      '/api/admin/form-config',
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id, config }),
      }
    ),
};
