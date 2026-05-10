// src/lib/types.ts — tipos do frontend

export interface FormConfigData {
  declaration: string;
  sections: FormSection[];
}

export interface FormConfigRecord {
  id: string;
  config: FormConfigData;
  atualizado_em: string;
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

export interface FichaResumo {
  id: string;
  numero_ficha: string;
  fac_numero: number;
  data_acampamento: string;
  nucleo: string | null;
  preenchida: boolean;
}

export interface FichaLista {
  id: string;
  numero_ficha: string;
  fac_numero: number;
  nome_completo: string | null;
  cpf: string | null;
  contra_senha: string;
  nucleo: string | null;
  preenchida: boolean;
  status_autorizacao: 'aguardando' | 'autorizada' | 'recusada';
  data_acampamento: string;
  criado_em: string;
}

export interface FichaCompleta {
  ficha: Record<string, unknown>;
  respostas: { campo_id: string; valor: string }[];
  documento: {
    nome_responsavel: string;
    cpf_responsavel: string;
    parentesco: string;
    assinatura_nome: string;
    documento_base64: string | null;
  } | null;
}

export interface Responsavel {
  nome: string;
  cpf: string;
  parentesco: string;
  telefone: string;
  assinatura_base64: string;
  documento_base64: string | null;
  documento_tipo: string | null;
}

export interface EnviarFichaPayload {
  ficha_id: string;
  respostas: Record<string, string>;
  responsavel: Responsavel;
  declaracao_aceita: boolean;
  nome_assinatura: string;
  telefone_jovem?: string;
  nome_completo?: string;
  cpf?: string;
}

export interface GerarLotePayload {
  fac_numero: number;
  data_acampamento: string;
  nucleo?: string;
  quantidade: number;
  inicio?: number;
}

export interface LoteItem {
  numero_ficha: string;
  contra_senha: string;
  fac_numero: number;
  data_acampamento: string;
  nucleo: string | null;
}
