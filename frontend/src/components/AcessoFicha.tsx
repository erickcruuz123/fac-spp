// src/components/AcessoFicha.tsx
import { useState } from 'react';
import { api } from '../lib/api';
import type { FichaResumo } from '../lib/types';

interface Props {
  onSuccess: (ficha: FichaResumo) => void;
}

export default function AcessoFicha({ onSuccess }: Props) {
  const [numero, setNumero] = useState('');
  const [cs, setCs] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function validar(e: React.FormEvent) {
    e.preventDefault();
    if (!numero || !cs) { setErro('Preencha o número e a contra-senha.'); return; }

    setLoading(true);
    setErro('');

    const res = await api.validarFicha(numero.toUpperCase(), cs.toUpperCase());
    setLoading(false);

    if (res.ok) {
      onSuccess(res.data);
    } else {
      setErro(res.error);
    }
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #b8cfe0',
      borderRadius: 12,
      padding: 32,
      maxWidth: 440,
      margin: '32px auto',
      boxShadow: '0 4px 24px rgba(26,58,92,.15)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>🎟️</div>
      <h2 style={{ fontFamily: 'Cinzel, serif', color: '#1a3a5c', fontSize: '1.05rem', marginBottom: 6 }}>
        Acesso à Ficha
      </h2>
      <p style={{ color: '#4a6a85', fontSize: '.84rem', marginBottom: 20 }}>
        Você recebeu um número e uma contra-senha do seu núcleo.
      </p>

      <form onSubmit={validar}>
        <div style={{ marginBottom: 12, textAlign: 'left' }}>
          <label style={labelStyle}>Número da Ficha *</label>
          <input
            type="text"
            value={numero}
            onChange={e => setNumero(e.target.value.toUpperCase())}
            placeholder="Ex: FAC12-001"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 18, textAlign: 'left' }}>
          <label style={labelStyle}>Contra-senha *</label>
          <input
            type="text"
            value={cs}
            onChange={e => setCs(e.target.value.toUpperCase())}
            placeholder="Ex: ABC-12345"
            onKeyDown={e => e.key === 'Enter' && validar(e as unknown as React.FormEvent)}
            style={{ ...inputStyle, letterSpacing: '.1em' }}
          />
        </div>

        {erro && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 7, padding: '10px 14px', fontSize: '.84rem', color: '#7b1a1a', marginBottom: 12, textAlign: 'left' }}>
            ❌ {erro}
          </div>
        )}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? '⏳ Verificando...' : 'Verificar e Preencher'}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.69rem',
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  color: '#4a6a85',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #b8cfe0',
  borderRadius: 6,
  fontFamily: 'Lato, sans-serif',
  fontSize: '1rem',
  textAlign: 'center',
  background: '#f0f5fa',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #1a3a5c, #2b5080)',
  color: '#e8c87a',
  border: 'none',
  borderRadius: 7,
  fontFamily: 'Lato, sans-serif',
  fontSize: '.88rem',
  fontWeight: 700,
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
