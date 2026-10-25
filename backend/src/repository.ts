import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { RecipeInput, RecipeSearch } from './validation.js';

export interface User { id: number; nome: string; login: string }
export interface StoredUser extends User { senha: string }
export interface Category { id: number; nome: string }
export interface Recipe extends RecipeInput {
  id: number; id_usuarios: number; categoria: string | null; criado_em: string; alterado_em: string;
}
export interface RecipePage { data: Recipe[]; total: number; pagina: number; limite: number; paginas: number }
export interface Repository {
  health(): Promise<void>;
  findUser(login: string): Promise<StoredUser | undefined>;
  createUser(nome: string, login: string, senha: string): Promise<User>;
  createSession(hash: string, userId: number): Promise<void>;
  sessionUser(hash: string): Promise<User | undefined>;
  deleteSession(hash: string): Promise<void>;
  categories(): Promise<Category[]>;
  listRecipes(userId: number, search: RecipeSearch): Promise<RecipePage>;
  getRecipe(userId: number, id: number): Promise<Recipe | undefined>;
  createRecipe(userId: number, input: RecipeInput): Promise<Recipe>;
  updateRecipe(userId: number, id: number, input: RecipeInput): Promise<Recipe | undefined>;
  deleteRecipe(userId: number, id: number): Promise<boolean>;
  stats(userId: number): Promise<{ total: number; rapidas: number; categorias: number }>;
}

export class MySqlRepository implements Repository {
  constructor(private db: Pool) {}
  async health() { await this.db.query('SELECT 1'); }
  async findUser(login: string) {
    const [rows] = await this.db.execute<(StoredUser & RowDataPacket)[]>('SELECT id, nome, login, senha FROM usuarios WHERE login = ?', [login]);
    return rows[0];
  }
  async createUser(nome: string, login: string, senha: string) {
    const [result] = await this.db.execute<ResultSetHeader>('INSERT INTO usuarios (nome, login, senha, criado_em, alterado_em) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())', [nome, login, senha]);
    return { id: result.insertId, nome, login };
  }
  async createSession(hash: string, userId: number) {
    await this.db.execute('DELETE FROM sessoes WHERE expira_em <= UTC_TIMESTAMP()');
    await this.db.execute('INSERT INTO sessoes (token_hash, id_usuarios, expira_em) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY))', [hash, userId]);
  }
  async sessionUser(hash: string) {
    const [rows] = await this.db.execute<(User & RowDataPacket)[]>('SELECT u.id, u.nome, u.login FROM sessoes s JOIN usuarios u ON u.id = s.id_usuarios WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP()', [hash]);
    return rows[0];
  }
  async deleteSession(hash: string) { await this.db.execute('DELETE FROM sessoes WHERE token_hash = ?', [hash]); }
  async categories() {
    const [rows] = await this.db.query<(Category & RowDataPacket)[]>('SELECT id, nome FROM categorias ORDER BY id');
    return rows;
  }
  async listRecipes(userId: number, search: RecipeSearch) {
    const conditions = ['r.id_usuarios = ?'];
    const params: (number | string)[] = [userId];
    if (search.busca) {
      conditions.push("(r.nome LIKE ? ESCAPE '!' OR r.ingredientes LIKE ? ESCAPE '!')");
      const term = `%${search.busca.replace(/[!%_]/g, '!$&')}%`;
      params.push(term, term);
    }
    if (search.categoria) { conditions.push('r.id_categorias = ?'); params.push(search.categoria); }
    if (search.tempo_maximo) { conditions.push('r.tempo_preparo_minutos <= ?'); params.push(search.tempo_maximo); }
    const where = conditions.join(' AND ');
    const order = { recentes: 'r.alterado_em DESC, r.id DESC', nome: 'r.nome ASC, r.id DESC', rapidas: 'r.tempo_preparo_minutos ASC, r.id DESC' }[search.ordem];
    const [count] = await this.db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM receitas r WHERE ${where}`, params);
    // Limite e offset são inteiros validados; o restante sempre usa parâmetros.
    const [rows] = await this.db.execute<(Recipe & RowDataPacket)[]>(`SELECT r.*, c.nome AS categoria FROM receitas r LEFT JOIN categorias c ON c.id = r.id_categorias WHERE ${where} ORDER BY ${order} LIMIT ${search.limite} OFFSET ${(search.pagina - 1) * search.limite}`, params);
    const total = Number(count[0].total);
    return { data: rows, total, pagina: search.pagina, limite: search.limite, paginas: Math.ceil(total / search.limite) };
  }
  async getRecipe(userId: number, id: number) {
    const [rows] = await this.db.execute<(Recipe & RowDataPacket)[]>('SELECT r.*, c.nome AS categoria FROM receitas r LEFT JOIN categorias c ON c.id = r.id_categorias WHERE r.id = ? AND r.id_usuarios = ?', [id, userId]);
    return rows[0];
  }
  async createRecipe(userId: number, input: RecipeInput) {
    const [result] = await this.db.execute<ResultSetHeader>('INSERT INTO receitas (id_usuarios, nome, id_categorias, tempo_preparo_minutos, porcoes, ingredientes, modo_preparo, criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())', [userId, input.nome, input.id_categorias, input.tempo_preparo_minutos, input.porcoes, input.ingredientes, input.modo_preparo]);
    return (await this.getRecipe(userId, result.insertId))!;
  }
  async updateRecipe(userId: number, id: number, input: RecipeInput) {
    const [result] = await this.db.execute<ResultSetHeader>('UPDATE receitas SET nome = ?, id_categorias = ?, tempo_preparo_minutos = ?, porcoes = ?, ingredientes = ?, modo_preparo = ?, alterado_em = UTC_TIMESTAMP() WHERE id = ? AND id_usuarios = ?', [input.nome, input.id_categorias, input.tempo_preparo_minutos, input.porcoes, input.ingredientes, input.modo_preparo, id, userId]);
    if (!result.affectedRows) return undefined;
    return this.getRecipe(userId, id);
  }
  async deleteRecipe(userId: number, id: number) {
    const [result] = await this.db.execute<ResultSetHeader>('DELETE FROM receitas WHERE id = ? AND id_usuarios = ?', [id, userId]);
    return result.affectedRows > 0;
  }
  async stats(userId: number) {
    const [rows] = await this.db.execute<RowDataPacket[]>('SELECT COUNT(*) AS total, COALESCE(SUM(tempo_preparo_minutos <= 30), 0) AS rapidas, COUNT(DISTINCT id_categorias) AS categorias FROM receitas WHERE id_usuarios = ?', [userId]);
    return { total: Number(rows[0].total), rapidas: Number(rows[0].rapidas), categorias: Number(rows[0].categorias) };
  }
}
