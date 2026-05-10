// src/types.ts — tipos compartilhados entre rotas

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_PASSWORD: string;
  WAHA_URL: string;
  WAHA_SESSION: string;
  WAHA_WEBHOOK_SECRET: string;
  FRONTEND_URL: string;
}

export interface Ficha {
  id: string;
  numero_ficha: string;
  contra_senha: string;
  fac_numero: number;
  data_acampamento: string;
  nucleo: string | null;
  preenchida: boolean;
  status_autorizacao: 'aguardando' | 'autorizada' | 'recusada';
  nome_completo: string | null;
  cpf: string | null;
  telefone_responsavel: string | null;
  telefone_jovem: string | null;
  nome_assinatura: string | null;
  data_assinatura: string | null;
  declaracao_aceita: boolean;
  criado_em: string;
}

export interface FormConfig {
  id: string;
  config: FormConfigData;
  atualizado_em: string;
}

export interface FormConfigData {
  declaration: string;
  sections: FormSection[];
}

export interface FormSection {
  id: string;
  icon: string;
  title: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  half?: boolean;
  options?: string[];
}

export interface Resposta {
  ficha_id: string;
  campo_id: string;
  valor: string;
}

export interface DocumentoResponsavel {
  ficha_id: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  parentesco: string;
  assinatura_nome: string;
  documento_base64: string | null;
  documento_tipo: string | null;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
