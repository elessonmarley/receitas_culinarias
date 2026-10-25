# Caderno · Receitas & memórias

Aplicação completa para guardar receitas pessoais. Backend REST em **Node.js + TypeScript + Express**, frontend em **Vue 3 + TypeScript** e persistência em **MySQL 8.4**.

## O que está incluído

- Cadastro de conta, login, restauração de sessão e logout com revogação no servidor.
- Cadastro, consulta, edição e exclusão de receitas, sempre restritos ao usuário autenticado.
- Busca por nome ou ingrediente, sem distinção de acentos, filtros por categoria e tempo, ordenação e paginação.
- As 13 categorias do desafio, visualização em grade/lista e estatísticas pessoais.
- Leitura com checklist de ingredientes e impressão com layout próprio para papel/PDF.
- Interface responsiva em português, abas **Entrar** e **Cadastrar**, navegação por teclado e estados de carregamento, erros e coleção vazia.
- Swagger/OpenAPI, Docker Compose, testes unitários, integração com MySQL real e E2E em navegador, além de CI no GitHub Actions.

O material do ZIP está preservado em [docs/referencia](docs/referencia). Ele foi usado como referência de funcionalidades e modelagem. As instruções deste README descrevem a implementação entregue. Foi escolhido Vue, permitido no pedido e compatível com o enunciado original; o escopo é o sistema web.

## 1. Executar tudo com Docker (caminho mais rápido)

**Pré-requisitos:** Docker Engine com Compose v2, ou Docker Desktop iniciado. Não é necessário instalar Node ou MySQL no computador para este caminho. As portas 8080, 3000 e 3306 precisam estar livres, ou podem ser alteradas no `.env` da raiz.

Clone o repositório e entre na pasta:

```sh
git clone https://github.com/elessonmarley/receitas_culinarias.git
cd receitas_culinarias
```

Na raiz do repositório, execute:

```sh
docker compose up --build -d --wait
```

O primeiro início baixa as imagens, instala as dependências, aguarda o MySQL ficar pronto, executa as migrações e cria os dados demonstrativos. Pode levar alguns minutos.

| Serviço | Endereço |
| --- | --- |
| Aplicação | http://localhost:8080 |
| Swagger interativo, mesma origem da aplicação | http://localhost:8080/api/docs/ |
| API direta | http://localhost:3000/api |
| OpenAPI JSON | http://localhost:3000/api/openapi.json |
| Saúde da API e banco | http://localhost:3000/api/health |
| MySQL, acesso local | `127.0.0.1:3306` |

**Conta demonstrativa:** `teste@receita.com` / `teste@123`. Para usar essa conta, informe as credenciais no formulário de login. São seis receitas editáveis, compartilhadas por quem usar essa conta local. Contas novas começam vazias e isoladas. A demonstração não é recriada se a conta já existir.

Comandos úteis:

```sh
docker compose ps
docker compose logs -f backend
docker compose logs -f db
docker compose down
docker compose up -d --wait
```

`down` preserva os dados no volume `mysql_data`. **`docker compose down -v` apaga definitivamente o banco deste Compose**, incluindo todas as contas e receitas. Use apenas se quiser reiniciar os dados.

### Personalizar portas e credenciais

Copie `.env.example` para `.env` na raiz antes de iniciar:

```powershell
Copy-Item .env.example .env
```

Em macOS/Linux, use `cp .env.example .env`. Ajuste `WEB_PORT`, `API_PORT`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` e `DEMO_SEED`. As portas são publicadas somente na interface local. Para desativar a conta demonstrativa, configure `DEMO_SEED=false` **antes do primeiro início**; isso não remove uma conta já criada.

As variáveis de inicialização do MySQL só configuram o usuário e o banco em um volume novo. Alterar senhas no `.env` não altera automaticamente usuários de um volume existente.

## 2. Desenvolvimento com Node e MySQL

**Pré-requisitos:** Node.js 22.12+ (recomendado 22 LTS), npm e MySQL 8.4. Para usar apenas o MySQL via Docker:

```sh
docker compose up -d db --wait
```

Se estiver usando MySQL instalado diretamente, conecte-se como administrador e execute, ajustando a senha conforme necessário:

```sql
CREATE DATABASE IF NOT EXISTS teste_receitas_rg_sistemas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'receitas'@'%' IDENTIFIED BY 'receitas_local_123';
GRANT ALL PRIVILEGES ON teste_receitas_rg_sistemas.* TO 'receitas'@'%';
```

As migrações criam as tabelas dentro do banco existente. Não é necessário importar o SQL original.

Na raiz, em PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

No macOS/Linux, use `cp backend/.env.example backend/.env` e `npm` no lugar de `npm.cmd`. O sufixo `.cmd` evita o bloqueio de `npm.ps1` pela política padrão de alguns PowerShells; não é necessário mudar a política de execução.

Edite `backend/.env` se seu banco tiver outra porta, usuário ou senha. `db:seed` é opcional. A migração é idempotente, utiliza um lock de banco e registra sua versão em `schema_migrations`. O seed usa uma transação e preserva uma conta demonstrativa existente.

- Frontend: **http://localhost:5173**
- API: **http://localhost:3000/api**
- Swagger: **http://localhost:5173/api/docs/**

O Vite encaminha `/api` ao backend em `127.0.0.1:3000`; o Nginx faz o mesmo no Docker. O navegador usa uma única origem e não precisa de token no armazenamento local. `WEB_ORIGIN` precisa corresponder exatamente à origem do frontend para operações de escrita; em desenvolvimento, o padrão é `http://localhost:5173`. Use `localhost`, sem trocar por `127.0.0.1` na URL do navegador.

### Variáveis do backend

| Variável | Padrão local | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta da API |
| `WEB_ORIGIN` | `http://localhost:5173` | Origem permitida do navegador |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | Conexão com MySQL |
| `DB_NAME` | `teste_receitas_rg_sistemas` | Banco já existente |
| `DB_USER` / `DB_PASSWORD` | `receitas` / `receitas_local_123` | Credenciais locais |
| `COOKIE_SECURE` | `false` | Configure `true` quando servir por HTTPS |
| `TRUST_PROXY` | `0` | `1` somente atrás de um único proxy confiável |

O `.env` da raiz parametriza o **Compose**; `backend/.env` parametriza a API **executada com Node**. Não versione nenhum deles. Os valores de exemplo são exclusivos de desenvolvimento. Para hospedar, use HTTPS, senhas próprias, desative o seed, ajuste origem/cookies/proxy e restrinja o acesso ao banco e à porta direta da API.

## 3. Testes e compilação

Instale as dependências com `npm ci` antes dos comandos a seguir. Os testes de integração não usam banco em memória: fazem chamadas HTTP contra o Express e verificam o MySQL real.

### Tipos, testes unitários e build

```sh
npm run typecheck
npm test
npm run build
```

Os unitários cobrem hashes de senha, geração e hash de tokens, normalização e limites dos contratos, IDs, paginação e tentativa de informar outro proprietário. O build gera `backend/dist` e `frontend/dist`.

### Integração: API + MySQL real

Inicie o banco **isolado**, na porta 3307:

```sh
docker compose -f compose.test.yaml up -d --wait
npm run test:integration
docker compose -f compose.test.yaml down
```

Esse banco usa `tmpfs` e suas informações são temporárias. Os testes criam contas únicas, executam migrações e removem somente as contas que criaram. Uma proteção exige que `TEST_DB_NAME` termine em `_test`. Nunca aponte esses testes ao banco da aplicação.

Padrões: host `127.0.0.1`, porta `3307`, banco `receitas_test`, usuário e senha `receitas_test`. Para outro servidor, ajuste `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_NAME`, `TEST_DB_USER` e `TEST_DB_PASSWORD` no ambiente.

Cobertura funcional: saúde e OpenAPI; JSON e origem inválidos; cadastro e duplicidade; senha protegida; cookies; CRUD persistido; busca com acentos, curingas literais, categoria, tempo e paginação; isolamento entre duas contas; persistência após novo login; logout e reutilização de cookie revogado; expiração de sessão.

### E2E: navegador + frontend + API + MySQL

Com o banco da aplicação iniciado e migrado (seção 2):

```sh
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia frontend e backend automaticamente, ou reutiliza servidores locais existentes. Executa em Chromium nos tamanhos desktop e iPhone. Os testes criam contas próprias, percorrem cadastro e CRUD pela interface, busca, filtros, troca de visualização, recarga, login/logout, erros e acionamento de impressão. A impressão nativa é interceptada no teste para não abrir o diálogo do sistema; a folha de estilos de impressão é verificada separadamente por emulação de mídia. A geração física de PDF não é validada.

Os usuários E2E permanecem no banco selecionado, com prefixo `e2e_`; as receitas criadas no fluxo são excluídas. Para usar o **banco de teste isolado** também no E2E, exporte antes de executar:

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3307'
$env:DB_NAME='receitas_test'
$env:DB_USER='receitas_test'
$env:DB_PASSWORD='receitas_test'
npm.cmd run db:migrate
npm.cmd run test:e2e
```

Garanta que não há um dev server anterior usando outro banco. No bash, use `export DB_PORT=3307` etc. Em CI, o workflow já usa esse isolamento.

Se já encerrou o banco temporário após a integração, inicie-o novamente com `docker compose -f compose.test.yaml up -d --wait` antes de executar os E2E nesse ambiente. A API Docker e a API de desenvolvimento usam a porta 3000: para o modo local, deixe as portas 3000 e 5173 livres ou teste o Compose com a configuração abaixo.

Para testar o Compose completo em vez dos servidores de desenvolvimento:

```powershell
$env:E2E_BASE_URL='http://localhost:8080'
$env:E2E_EXTERNAL_SERVER='true'
npm.cmd run test:e2e
```

O relatório fica em `playwright-report/index.html`; screenshots e traces são mantidos em falhas. O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) executa tipos, unitários, integração, build e E2E com MySQL 8.4.

## 4. API REST

Documentação interativa em `/api/docs/` e contrato em `/api/openapi.json`. No Swagger servido pela mesma origem, faça login ou cadastro antes de usar as rotas protegidas; o navegador recebe e envia o cookie automaticamente. O cookie é HttpOnly e não é editado manualmente no Swagger.

O contrato OpenAPI é definido explicitamente em `backend/src/openapi.ts` e apresentado pelo `swagger-ui-express`. Ele não é extraído automaticamente das rotas ou do Zod: ao alterar a API, atualize também os parâmetros, schemas e respostas desse arquivo. Não há um comando separado para gerar o Swagger; iniciar a API disponibiliza a documentação.

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| GET | `/api/health` | Saúde da API e conexão com banco |
| POST | `/api/auth/register` | Criar conta e sessão |
| POST | `/api/auth/login` | Iniciar sessão |
| GET | `/api/auth/me` | Usuário autenticado |
| POST | `/api/auth/logout` | Revogar sessão atual |
| GET | `/api/categories` | Listar categorias |
| GET | `/api/recipes/stats` | Estatísticas pessoais |
| GET | `/api/recipes` | Pesquisar receitas pessoais |
| POST | `/api/recipes` | Criar receita |
| GET | `/api/recipes/:id` | Consultar receita pessoal |
| PUT | `/api/recipes/:id` | Editar todos os campos da receita |
| DELETE | `/api/recipes/:id` | Excluir receita pessoal |

Busca: `GET /api/recipes?busca=cenoura&categoria=1&tempo_maximo=60&ordem=recentes&pagina=1&limite=9`. Ordenações: `recentes`, `nome`, `rapidas`. O limite máximo é 50. A pesquisa trata `%`, `_` e `!` literalmente.

Exemplo usando curl (no Windows, use `curl.exe` para evitar o alias do PowerShell):

```sh
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"login":"teste@receita.com","senha":"teste@123"}' \
  http://localhost:3000/api/auth/login

curl -b cookies.txt http://localhost:3000/api/recipes

curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"nome":"Omelete","id_categorias":10,"tempo_preparo_minutos":10,"porcoes":1,"ingredientes":"2 ovos\nSal a gosto","modo_preparo":"Bata os ovos.\nDoure na frigideira."}' \
  http://localhost:3000/api/recipes

curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

Respostas: `201` para criação, `204` para exclusão/logout, `400` para validação, `401` para falta/expiração de sessão, `403` para origem não permitida, `404` para receita inexistente **ou de outro usuário**, `409` para login duplicado e `429` para excesso de tentativas de autenticação. Erros seguem `{ "message": "...", "errors": [{ "field": "nome", "message": "..." }] }`, com `errors` apenas na validação.

## 5. Organização e decisões

### Comunicação entre os componentes

```text
Navegador com Vue
    → HTTP /api, JSON e cookie de sessão
    → Vite (desenvolvimento) ou Nginx (Docker)
    → API Express: validação e autenticação
    → Repositório mysql2: consultas parametrizadas
    → MySQL
    → Resposta JSON para atualização da interface
```

O frontend não possui credenciais do banco nem consulta o MySQL diretamente. Login, cadastro e operações de receitas passam pela API. A interface mantém a sessão por cookie HttpOnly; não utiliza JWT ou armazena o token no `localStorage`.

### Estrutura

```text
backend/src/
  app.ts                 Rotas, middlewares, sessão, erros e composição da API
  server.ts              Servidor HTTP e encerramento gracioso
  repository.ts          Contrato de persistência e consultas MySQL parametrizadas
  security.ts            Scrypt, tokens aleatórios e hashes
  validation.ts          Contratos Zod de entrada
  openapi.ts             Especificação OpenAPI 3
  database/              Pool, migração versionada e seed opcional
backend/tests/           Unitários e integração real
frontend/src/
  App.vue                Autenticação, coleção, filtros e estado da aplicação
  api.ts                 Cliente HTTP e tratamento de sessão expirada
  components/            Formulário, detalhe e ilustrações SVG locais
  style.css              Layout responsivo e estilos de impressão
e2e/                     Fluxos Playwright
docs/referencia/         Enunciado, SQL, PDF e modelo Workbench do ZIP
```

**Banco:** preserva os nomes, campos principais e relacionamentos de `usuarios`, `categorias` e `receitas`, inclusive o limite de 45 caracteres do nome da receita. Acrescenta `sessoes` e `schema_migrations`. O hash Scrypt com salt ocupa 97 caracteres e cabe no `VARCHAR(100)` original. As receitas são ordenadas por última alteração por padrão. Datas são armazenadas em UTC. O filtro rápido inclui tempos de até 30 minutos.

**Autenticação:** token opaco de 256 bits em cookie `HttpOnly; SameSite=Lax`, validade absoluta de sete dias. Somente o hash SHA-256 do token é persistido; logout o remove do banco. Login substitui a sessão enviada no cookie. Sessões expiradas são rejeitadas imediatamente e removidas ao criar uma nova sessão. Senhas usam Scrypt com salt aleatório e comparação em tempo constante. Login/cadastro possuem limite de 30 requisições por IP a cada 15 minutos.

**Autorização:** toda consulta, edição, exclusão e estatística de receitas inclui o ID da conta autenticada. O cliente não escolhe o dono. Consultas SQL usam parâmetros; os únicos trechos dinâmicos são ordenações de uma lista permitida e inteiros previamente validados. O frontend usa interpolação de texto do Vue, sem renderizar HTML fornecido pelo usuário.

**Interface:** `dialog` nativo mantém o foco no modal e aceita Escape, campos têm rótulos e limites, estados informativos usam `alert`/`status`, há foco visível e suporte a redução de movimento. As ilustrações SVG são locais; fontes do Google são opcionais, com fallbacks de sistema.

## 6. Problemas comuns

- **Docker não conecta:** abra Docker Desktop e aguarde o Engine ficar pronto. Verifique `docker info`. O CLI instalado sozinho não inicia containers.
- **Porta ocupada:** altere o `.env` da raiz e recrie os serviços com `docker compose up -d --build --wait`. No desenvolvimento, Vite usa 5173 e a API usa 3000.
- **Erro de banco:** confira `docker compose ps`, `docker compose logs db` e as credenciais. Rodando Node localmente, confira `backend/.env`; o host é `127.0.0.1`, não `db`.
- **Tabela não existe:** execute `npm run db:migrate` antes de iniciar a API com Node. O Compose faz isso automaticamente.
- **Erro 403:** abra o frontend pela origem configurada em `WEB_ORIGIN`. No Compose o padrão é `http://localhost:8080`; no Vite é `http://localhost:5173`.
- **Conta demonstrativa não entra:** execute `npm run db:seed`, ou confirme `DEMO_SEED=true` no Compose. Você também pode cadastrar uma conta nova.
- **E2E não encontra navegador:** execute `npx playwright install chromium`; em Linux/CI, use `npx playwright install --with-deps chromium`.
- **Dependências bloqueadas pela rede:** permita acesso ao registry npm e aos downloads de imagens Docker/navegador. Nenhum serviço externo de autenticação é necessário.

## Referências técnicas

[Vue + TypeScript](https://vuejs.org/guide/typescript/overview), [Express 5 e tratamento de erros](https://expressjs.com/en/5x/guide/error-handling/), [MySQL2 e prepared statements](https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements).
