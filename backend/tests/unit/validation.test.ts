import { describe, expect, it } from 'vitest';
import { idSchema, recipeSchema, registerSchema, searchSchema } from '../../src/validation.js';

const valid = { nome: 'Sopa caseira', id_categorias: 6, tempo_preparo_minutos: 20, porcoes: 2, ingredientes: '2 batatas\n1 cenoura', modo_preparo: 'Cozinhe todos os ingredientes.' };
describe('Contratos de entrada', () => {
  it('normaliza login e nome sem alterar a senha', () => {
    expect(registerSchema.parse({ nome: '  Maria  ', login: ' MARIA@EMAIL.COM ', senha: ' senha123 ' })).toEqual({ nome: 'Maria', login: 'maria@email.com', senha: ' senha123 ' });
  });
  it.each([{ ...valid, tempo_preparo_minutos: -1 }, { ...valid, porcoes: 1.5 }, { ...valid, nome: 'a'.repeat(46) }, { ...valid, id_usuarios: 55 }, { ...valid, ingredientes: '' }, { ...valid, id_categorias: 0 }])('rejeita valores inválidos e tentativa de escolher o dono', input => {
    expect(recipeSchema.safeParse(input).success).toBe(false);
  });
  it('aceita receita sem categoria', () => { expect(recipeSchema.safeParse({ ...valid, id_categorias: null }).success).toBe(true); });
  it('valida paginação, ordenação e IDs', () => {
    expect(searchSchema.parse({ pagina: '2', limite: '5' }).pagina).toBe(2);
    expect(searchSchema.safeParse({ ordem: 'nome; DROP TABLE receitas' }).success).toBe(false);
    expect(searchSchema.safeParse({ limite: '500' }).success).toBe(false);
    expect(searchSchema.safeParse({ pagina: '0' }).success).toBe(false);
    expect(idSchema.safeParse('1 OR 1=1').success).toBe(false);
  });
});
