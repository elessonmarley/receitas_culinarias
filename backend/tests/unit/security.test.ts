import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, newToken, tokenHash } from '../../src/security.js';

describe('Senhas e sessões', () => {
  it('usa salt aleatório, verifica a senha e rejeita uma senha incorreta', async () => {
    const hash = await hashPassword('Minha senha de teste!');
    const second = await hashPassword('Minha senha de teste!');
    expect(hash).not.toBe(second);
    expect(hash.length).toBeLessThanOrEqual(100); // Compatível com o modelo original.
    expect(await verifyPassword('Minha senha de teste!', hash)).toBe(true);
    expect(await verifyPassword('Outra senha!', hash)).toBe(false);
    expect(await verifyPassword('senha', 'corrompido')).toBe(false);
  });
  it('gera tokens imprevisíveis e armazena apenas seu hash', () => {
    const token = newToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toBe(newToken());
    expect(tokenHash(token)).not.toBe(token);
    expect(tokenHash(token)).toBe(tokenHash(token));
  });
});
