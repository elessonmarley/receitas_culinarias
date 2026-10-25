const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const response = (description: string, schema?: object) => ({ description, ...(schema ? { content: json(schema) } : {}) });
const body = (name: string) => ({ required: true, content: json(ref(name)) });
const errors = {
  400: response('Dados inválidos', ref('Error')), 401: response('Autenticação necessária', ref('Error')),
  403: response('Origem não permitida', ref('Error')), 500: response('Erro interno', ref('Error')),
};
const recipeProperties = {
  nome: { type: 'string', minLength: 2, maxLength: 45, example: 'Panqueca de banana' },
  id_categorias: { type: 'integer', nullable: true, minimum: 1, example: 10 },
  tempo_preparo_minutos: { type: 'integer', minimum: 1, maximum: 10080, example: 15 },
  porcoes: { type: 'integer', minimum: 1, maximum: 1000, example: 2 },
  ingredientes: { type: 'string', minLength: 3, maxLength: 20000, example: '1 banana\n2 ovos\n2 colheres de aveia' },
  modo_preparo: { type: 'string', minLength: 3, maxLength: 30000, example: 'Amasse a banana.\nMisture os ingredientes.\nDoure na frigideira.' },
};
export const openapi = {
  openapi: '3.0.3',
  info: { title: 'Caderno de receitas — API', version: '1.0.0', description: 'API REST em Node.js + TypeScript e MySQL. Cadastre-se ou faça login para receber o cookie HttpOnly. Cada usuário acessa somente suas receitas. Sessões expiram em sete dias e são revogadas no logout. Datas do banco em UTC. Em requisições do navegador, a origem deve coincidir com WEB_ORIGIN.' },
  servers: [{ url: '/api', description: 'Mesma origem (frontend/Nginx ou API local)' }],
  tags: [{ name: 'Autenticação' }, { name: 'Receitas' }, { name: 'Categorias' }, { name: 'Sistema' }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'receitas_session' } },
    schemas: {
      User: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, login: { type: 'string' } }, required: ['id', 'nome', 'login'] },
      Register: { type: 'object', additionalProperties: false, required: ['nome', 'login', 'senha'], properties: { nome: { type: 'string', minLength: 2, maxLength: 100 }, login: { type: 'string', minLength: 3, maxLength: 100, pattern: '^[a-zA-Z0-9._@+\u002d]+$', example: 'maria' }, senha: { type: 'string', minLength: 8, maxLength: 128, format: 'password' } } },
      Login: { type: 'object', additionalProperties: false, required: ['login', 'senha'], properties: { login: { type: 'string', example: 'teste@receita.com' }, senha: { type: 'string', format: 'password', example: 'teste@123' } } },
      Error: { type: 'object', properties: { message: { type: 'string' }, errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } } }, required: ['message'] },
      RecipeInput: { type: 'object', additionalProperties: false, required: Object.keys(recipeProperties), properties: recipeProperties },
      Recipe: { type: 'object', properties: { ...recipeProperties, id: { type: 'integer' }, id_usuarios: { type: 'integer' }, categoria: { type: 'string', nullable: true }, criado_em: { type: 'string', example: '2026-10-24 12:00:00' }, alterado_em: { type: 'string' } } },
      RecipePage: { type: 'object', properties: { data: { type: 'array', items: ref('Recipe') }, total: { type: 'integer' }, pagina: { type: 'integer' }, limite: { type: 'integer' }, paginas: { type: 'integer' } } },
      Stats: { type: 'object', properties: { total: { type: 'integer' }, rapidas: { type: 'integer' }, categorias: { type: 'integer' } } },
      Category: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' } } },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    '/health': { get: { tags: ['Sistema'], security: [], summary: 'Verifica API e conexão com MySQL', responses: { 200: response('Banco disponível', { type: 'object', properties: { status: { type: 'string', example: 'ok' } } }), 503: response('Banco indisponível', ref('Error')) } } },
    '/auth/register': { post: { tags: ['Autenticação'], security: [], summary: 'Cria uma conta e inicia a sessão', requestBody: body('Register'), responses: { 201: response('Usuário criado; cookie enviado', ref('User')), ...errors, 409: response('Login já cadastrado', ref('Error')), 429: response('Muitas tentativas', ref('Error')) } } },
    '/auth/login': { post: { tags: ['Autenticação'], security: [], summary: 'Inicia a sessão', requestBody: body('Login'), responses: { 200: response('Sessão iniciada; cookie enviado', ref('User')), ...errors, 429: response('Muitas tentativas', ref('Error')) } } },
    '/auth/me': { get: { tags: ['Autenticação'], summary: 'Retorna o usuário da sessão', responses: { 200: response('Usuário atual', ref('User')), ...errors } } },
    '/auth/logout': { post: { tags: ['Autenticação'], summary: 'Revoga a sessão atual e remove o cookie (idempotente)', responses: { 204: response('Sessão encerrada'), ...errors } } },
    '/categories': { get: { tags: ['Categorias'], summary: 'Lista as 13 categorias do desafio', responses: { 200: response('Categorias', { type: 'array', items: ref('Category') }), ...errors } } },
    '/recipes/stats': { get: { tags: ['Receitas'], summary: 'Totais do usuário, receitas de até 30 minutos e categorias utilizadas', responses: { 200: response('Estatísticas', ref('Stats')), ...errors } } },
    '/recipes': {
      get: { tags: ['Receitas'], summary: 'Pesquisa somente receitas do usuário autenticado', parameters: [
        { name: 'busca', in: 'query', description: 'Trecho literal do nome ou ingredientes (sem distinção de acentos)', schema: { type: 'string', maxLength: 100 } },
        { name: 'categoria', in: 'query', schema: { type: 'integer', minimum: 1 } },
        { name: 'tempo_maximo', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10080 } },
        { name: 'ordem', in: 'query', schema: { type: 'string', enum: ['recentes', 'nome', 'rapidas'], default: 'recentes' } },
        { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100000, default: 1 } },
        { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 9 } },
      ], responses: { 200: response('Página de receitas', ref('RecipePage')), ...errors } },
      post: { tags: ['Receitas'], summary: 'Cadastra uma receita para o usuário atual', requestBody: body('RecipeInput'), responses: { 201: response('Receita criada', ref('Recipe')), ...errors } },
    },
    '/recipes/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      get: { tags: ['Receitas'], summary: 'Consulta uma receita própria', responses: { 200: response('Receita', ref('Recipe')), ...errors, 404: response('Receita não encontrada', ref('Error')) } },
      put: { tags: ['Receitas'], summary: 'Substitui os campos editáveis de uma receita própria', requestBody: body('RecipeInput'), responses: { 200: response('Receita atualizada', ref('Recipe')), ...errors, 404: response('Receita não encontrada', ref('Error')) } },
      delete: { tags: ['Receitas'], summary: 'Exclui uma receita própria', responses: { 204: response('Receita excluída'), ...errors, 404: response('Receita não encontrada', ref('Error')) } },
    },
  },
};
