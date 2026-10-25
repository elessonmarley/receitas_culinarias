import { pathToFileURL } from 'node:url';
import { pool } from './pool.js';
import { hashPassword } from '../security.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute<RowDataPacket[]>('SELECT id FROM usuarios WHERE login = ?', ['teste@receita.com']);
    if (existing.length) { await connection.commit(); console.log('Conta demonstrativa já existe; dados preservados.'); return; }
    const [user] = await connection.execute<ResultSetHeader>('INSERT INTO usuarios (nome, login, senha, criado_em, alterado_em) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())', ['Marina', 'teste@receita.com', await hashPassword('teste@123')]);
    const recipes = [
      { nome: 'Salada de verão', category: 5, time: 15, servings: 2, ingredients: '1 maço de rúcula\n200 g de tomates-cereja\n1 pepino\n100 g de queijo branco\n2 colheres de azeite\nSuco de 1 limão\nSal a gosto', steps: 'Lave e seque a rúcula e os legumes.\nCorte os tomates ao meio e o pepino em fatias.\nDistribua em uma travessa e acrescente o queijo em cubos.\nMisture azeite, limão e sal. Tempere na hora de servir.' },
      { nome: 'Pasta ao molho de tomate', category: 7, time: 30, servings: 4, ingredients: '400 g de espaguete\n4 tomates maduros\n2 dentes de alho\n2 colheres de azeite\nFolhas de manjericão\nSal e pimenta a gosto', steps: 'Cozinhe o espaguete em água com sal conforme a embalagem.\nRefogue o alho no azeite e acrescente os tomates picados.\nCozinhe por 15 minutos, mexendo de vez em quando.\nEnvolva a massa no molho e finalize com manjericão.' },
      { nome: 'Bolo de cenoura da vovó', category: 1, time: 55, servings: 10, ingredients: '3 cenouras médias\n3 ovos\n1 xícara de óleo\n2 xícaras de açúcar\n2 e 1/2 xícaras de farinha de trigo\n1 colher de fermento\n100 g de chocolate meio amargo', steps: 'Preaqueça o forno a 180 °C e unte uma forma.\nBata cenoura, ovos e óleo no liquidificador.\nMisture com açúcar e farinha. Acrescente o fermento delicadamente.\nAsse por cerca de 40 minutos, até o palito sair limpo.\nDerreta o chocolate e espalhe sobre o bolo.' },
      { nome: 'Torrada com abacate e ovo', category: 10, time: 10, servings: 1, ingredients: '2 fatias de pão integral\n1/2 abacate\n1 ovo\nSuco de 1/2 limão\nSal e pimenta a gosto', steps: 'Toste as fatias de pão.\nAmasse o abacate com limão e sal.\nPrepare o ovo em uma frigideira antiaderente.\nEspalhe o abacate sobre as torradas, coloque o ovo e finalize com pimenta.' },
      { nome: 'Risoto de cogumelos', category: 11, time: 45, servings: 3, ingredients: '1 xícara de arroz arbóreo\n200 g de cogumelos\n1/2 cebola\n1 litro de caldo de legumes quente\n2 colheres de manteiga\n50 g de parmesão ralado', steps: 'Doure os cogumelos em metade da manteiga e reserve.\nRefogue a cebola, junte o arroz e mexa por um minuto.\nAdicione o caldo aos poucos, mexendo até cada concha ser absorvida.\nQuando o arroz estiver al dente, misture os cogumelos, o restante da manteiga e o parmesão. Sirva imediatamente.' },
      { nome: 'Panquecas de banana', category: 10, time: 20, servings: 2, ingredients: '2 bananas maduras\n2 ovos\n4 colheres de aveia\n1 pitada de canela\nMel a gosto', steps: 'Amasse as bananas e misture com os ovos.\nAcrescente aveia e canela e mexa até incorporar.\nAqueça uma frigideira antiaderente em fogo baixo.\nDistribua pequenas porções e doure dos dois lados.\nSirva com mel e rodelas de banana.' },
    ];
    for (let index = 0; index < recipes.length; index++) {
      const r = recipes[index];
      await connection.execute('INSERT INTO receitas (id_usuarios, id_categorias, nome, tempo_preparo_minutos, porcoes, ingredientes, modo_preparo, criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR))', [user.insertId, r.category, r.nome, r.time, r.servings, r.ingredients, r.steps, index, index]);
    }
    await connection.commit();
    console.log('Conta demonstrativa criada: teste@receita.com / teste@123');
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
}
