import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mysql from 'mysql2/promise';
import { createApp } from '../../src/app.js';
import { migrate } from '../../src/database/migrate.js';
import { MySqlRepository } from '../../src/repository.js';
import { tokenHash } from '../../src/security.js';

const database = process.env.TEST_DB_NAME ?? 'receitas_test';
if (!database.endsWith('_test')) throw new Error('TEST_DB_NAME precisa terminar em _test. Nunca use o banco da aplicação.');
const db = mysql.createPool({ host: process.env.TEST_DB_HOST ?? '127.0.0.1', port: Number(process.env.TEST_DB_PORT ?? 3307), user: process.env.TEST_DB_USER ?? 'receitas_test', password: process.env.TEST_DB_PASSWORD ?? 'receitas_test', database, connectionLimit: 4, dateStrings: true, timezone: 'Z' });
const app = createApp(new MySqlRepository(db));
const owner = request.agent(app);
const other = request.agent(app);
const login = `teste_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const recipe = { nome: 'Panqueca de maçã', id_categorias: 10, tempo_preparo_minutos: 15, porcoes: 2, ingredientes: '1 maçã\n2 ovos\nFarinha 100% integral', modo_preparo: 'Misture os ingredientes.\nDoure em fogo baixo.' };
let recipeId = 0;
let ownerId = 0;
let otherId = 0;

beforeAll(async () => { await migrate(db); });
afterAll(async () => {
  try {
    for (const id of [ownerId, otherId].filter(Boolean)) {
      await db.execute('DELETE FROM receitas WHERE id_usuarios = ?', [id]);
      await db.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    }
  } finally { await db.end(); }
});

describe('API REST com MySQL real', () => {
  it('verifica saúde e publica documentação válida', async () => {
    expect((await request(app).get('/api/health')).body.status).toBe('ok');
    const spec = await request(app).get('/api/openapi.json').expect(200);
    expect(spec.body.paths['/recipes/{id}'].put).toBeDefined();
    await request(app).get('/api/docs/').expect(200);
  });
  it('rejeita acesso anônimo, JSON inválido e origem externa', async () => {
    await request(app).get('/api/recipes').expect(401);
    await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{').expect(400);
    await request(app).post('/api/auth/register').set('Origin', 'https://site-externo.test').send({}).expect(403);
    await request(app).post('/api/auth/register').send({ nome: 'M', login: 'ab', senha: '123' }).expect(400);
  });
  it('cadastra dois usuários, protege a senha e rejeita login duplicado', async () => {
    const result = await owner.post('/api/auth/register').send({ nome: 'Pessoa Teste', login, senha: 'teste@123' }).expect(201);
    ownerId = result.body.id;
    expect(result.body.senha).toBeUndefined();
    const cookie = result.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Lax');
    const otherResult = await other.post('/api/auth/register').send({ nome: 'Outra Pessoa', login: `${login}_outra`, senha: 'teste@123' }).expect(201);
    otherId = otherResult.body.id;
    await request(app).post('/api/auth/register').send({ nome: 'Duplicado', login: login.toUpperCase(), senha: 'teste@123' }).expect(409);
    const [users] = await db.execute<mysql.RowDataPacket[]>('SELECT senha FROM usuarios WHERE id = ?', [ownerId]);
    expect(users[0].senha).not.toBe('teste@123');
    await owner.get('/api/auth/me').expect(200);
  });
  it('cadastra receita persistida e valida categoria e proprietário', async () => {
    await owner.post('/api/recipes').send({ ...recipe, id_categorias: 999999 }).expect(400);
    await owner.post('/api/recipes').send({ ...recipe, id_usuarios: otherId }).expect(400);
    const result = await owner.post('/api/recipes').send(recipe).expect(201);
    recipeId = result.body.id;
    expect(result.body.id_usuarios).toBe(ownerId);
    expect(result.headers.location).toBe(`/api/recipes/${recipeId}`);
    const [rows] = await db.execute<mysql.RowDataPacket[]>('SELECT nome FROM receitas WHERE id = ?', [recipeId]);
    expect(rows[0].nome).toBe(recipe.nome);
    const categories = await owner.get('/api/categories').expect(200);
    expect(categories.body).toHaveLength(13);
  });
  it('pesquisa por nome e ingrediente com acentos e curingas literais, filtra e pagina', async () => {
    expect((await owner.get('/api/recipes').query({ busca: 'maca' }).expect(200)).body.total).toBe(1);
    expect((await owner.get('/api/recipes').query({ busca: '100%' }).expect(200)).body.total).toBe(1);
    expect((await owner.get('/api/recipes').query({ busca: '%' }).expect(200)).body.total).toBe(1);
    expect((await owner.get('/api/recipes').query({ busca: '_' }).expect(200)).body.total).toBe(0);
    expect((await owner.get('/api/recipes').query({ categoria: 7 }).expect(200)).body.total).toBe(0);
    expect((await owner.get('/api/recipes').query({ tempo_maximo: 10 }).expect(200)).body.total).toBe(0);
    const result = await owner.get('/api/recipes').query({ categoria: 10, tempo_maximo: 30, ordem: 'nome', limite: 1, pagina: 2 }).expect(200);
    expect(result.body.total).toBe(1); expect(result.body.data).toHaveLength(0);
    await owner.get('/api/recipes').query({ pagina: 0 }).expect(400);
    expect((await owner.get('/api/recipes').query({ busca: "' OR 1=1 --" }).expect(200)).body.total).toBe(0);
  });
  it('isola consulta, pesquisa, edição, exclusão e estatísticas entre usuários', async () => {
    expect((await other.get('/api/recipes').expect(200)).body.total).toBe(0);
    await other.get(`/api/recipes/${recipeId}`).expect(404);
    await other.put(`/api/recipes/${recipeId}`).send(recipe).expect(404);
    await other.delete(`/api/recipes/${recipeId}`).expect(404);
    expect((await other.get('/api/recipes/stats').expect(200)).body).toEqual({ total: 0, rapidas: 0, categorias: 0 });
    expect((await owner.get('/api/recipes/stats').expect(200)).body).toEqual({ total: 1, rapidas: 1, categorias: 1 });
  });
  it('edita e confirma persistência em uma nova sessão', async () => {
    await owner.put(`/api/recipes/${recipeId}`).send({ ...recipe, nome: 'Panqueca atualizada', id_categorias: null }).expect(200);
    const newSession = request.agent(app);
    await newSession.post('/api/auth/login').send({ login, senha: 'teste@123' }).expect(200);
    const result = await newSession.get(`/api/recipes/${recipeId}`).expect(200);
    expect(result.body.nome).toBe('Panqueca atualizada'); expect(result.body.id_categorias).toBeNull();
    await newSession.post('/api/auth/logout').expect(204);
    await request(app).post('/api/auth/login').send({ login, senha: 'SenhaIncorreta' }).expect(401);
  });
  it('revoga a sessão no logout, mesmo reutilizando o cookie antigo', async () => {
    const loginResult = await owner.post('/api/auth/login').send({ login, senha: 'teste@123' }).expect(200);
    const oldCookie = loginResult.headers['set-cookie'][0].split(';')[0];
    await owner.post('/api/auth/logout').expect(204);
    await request(app).get('/api/auth/me').set('Cookie', oldCookie).expect(401);
    await owner.get('/api/recipes').expect(401);
    await owner.post('/api/auth/login').send({ login, senha: 'teste@123' }).expect(200);
  });
  it('rejeita sessão expirada e permite novo login', async () => {
    const loginResult = await owner.post('/api/auth/login').send({ login, senha: 'teste@123' }).expect(200);
    const token = loginResult.headers['set-cookie'][0].split(';')[0].split('=')[1];
    await db.execute('UPDATE sessoes SET expira_em = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE token_hash = ?', [tokenHash(token)]);
    await owner.get('/api/auth/me').expect(401);
    await owner.post('/api/auth/login').send({ login, senha: 'teste@123' }).expect(200);
  });
  it('exclui a receita e retorna 404 nas próximas consultas', async () => {
    await owner.delete(`/api/recipes/${recipeId}`).expect(204);
    await owner.get(`/api/recipes/${recipeId}`).expect(404);
    await owner.delete(`/api/recipes/${recipeId}`).expect(404);
    expect((await owner.get('/api/recipes/stats')).body.total).toBe(0);
  });
});
