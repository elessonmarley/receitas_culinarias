import { pathToFileURL } from 'node:url';
import type { Pool } from 'mysql2/promise';
import { pool } from './pool.js';

export async function migrate(db: Pool = pool) {
  // O lock evita execução concorrente de migrações por múltiplas instâncias.
  const connection = await db.getConnection();
  try {
    const [lock] = await connection.query<any[]>("SELECT GET_LOCK('receitas_migrations', 30) AS acquired");
    if (lock[0].acquired !== 1) throw new Error('Não foi possível obter o lock das migrações.');
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const [applied] = await connection.query<any[]>('SELECT version FROM schema_migrations WHERE version = 1');
    if (!applied.length) {
      const statements = [
        `CREATE TABLE IF NOT EXISTS usuarios (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(100),
          login VARCHAR(100) NOT NULL UNIQUE, senha VARCHAR(100) NOT NULL,
          criado_em DATETIME NOT NULL, alterado_em DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
        `CREATE TABLE IF NOT EXISTS categorias (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(100) UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
        `CREATE TABLE IF NOT EXISTS receitas (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          id_usuarios INT UNSIGNED NOT NULL, id_categorias INT UNSIGNED NULL,
          nome VARCHAR(45), tempo_preparo_minutos INT UNSIGNED, porcoes INT UNSIGNED,
          modo_preparo TEXT NOT NULL, ingredientes TEXT,
          criado_em DATETIME NOT NULL, alterado_em DATETIME NOT NULL,
          INDEX idx_receitas_usuario_data (id_usuarios, alterado_em),
          FOREIGN KEY (id_usuarios) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (id_categorias) REFERENCES categorias(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
        `CREATE TABLE IF NOT EXISTS sessoes (
          token_hash CHAR(64) PRIMARY KEY, id_usuarios INT UNSIGNED NOT NULL,
          expira_em DATETIME NOT NULL, INDEX idx_sessoes_expira (expira_em),
          FOREIGN KEY (id_usuarios) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      ];
      for (const sql of statements) await connection.query(sql);
      const categories = ['Bolos e tortas doces', 'Carnes', 'Aves', 'Peixes e frutos do mar',
        'Saladas, molhos e acompanhamentos', 'Sopas', 'Massas', 'Bebidas', 'Doces e sobremesas',
        'Lanches', 'Prato Único', 'Light', 'Alimentação Saudável'];
      for (let index = 0; index < categories.length; index++) {
        await connection.execute('INSERT IGNORE INTO categorias (id, nome) VALUES (?, ?)', [index + 1, categories[index]]);
      }
      await connection.execute('INSERT INTO schema_migrations (version) VALUES (1)');
    }
  } finally {
    await connection.query("SELECT RELEASE_LOCK('receitas_migrations')");
    connection.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().then(() => console.log('Banco de dados atualizado.')).catch(error => {
    console.error(error); process.exitCode = 1;
  }).finally(() => pool.end());
}
