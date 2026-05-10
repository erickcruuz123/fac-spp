// src/supabase.ts — cliente Supabase para o Worker

import type { Env } from './types';

export class SupabaseClient {
  private url: string;
  private key: string;

  constructor(env: Env) {
    this.url = env.SUPABASE_URL;
    this.key = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  private headers() {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  async select<T>(table: string, query = ''): Promise<T[]> {
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Supabase select error: ${await res.text()}`);
    return res.json() as Promise<T[]>;
  }

  async selectOne<T>(table: string, query = ''): Promise<T | null> {
    const rows = await this.select<T>(table, query + '&limit=1');
    return rows[0] ?? null;
  }

  async insert<T>(table: string, data: object | object[]): Promise<T[]> {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json() as { message?: string; code?: string };
      const error = new Error(err.message ?? 'Insert error') as Error & { code?: string };
      error.code = err.code;
      throw error;
    }
    return res.json() as Promise<T[]>;
  }

  async patch(table: string, query: string, data: object): Promise<void> {
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: { ...this.headers(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Supabase patch error: ${await res.text()}`);
  }

  async delete(table: string, query: string): Promise<void> {
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
      method: 'DELETE',
      headers: { ...this.headers(), 'Prefer': 'return=minimal' },
    });
    if (!res.ok) throw new Error(`Supabase delete error: ${await res.text()}`);
  }
}
