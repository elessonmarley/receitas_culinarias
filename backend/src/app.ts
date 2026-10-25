import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { config } from './config.js';
import type { Repository, User } from './repository.js';
import { hashPassword, newToken, tokenHash, verifyPassword } from './security.js';
import { idSchema, loginSchema, recipeSchema, registerSchema, searchSchema } from './validation.js';
import { openapi } from './openapi.js';

declare global { namespace Express { interface Request { user?: User } } }
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const COOKIE = 'receitas_session';
const cookieOptions = { httpOnly: true, secure: config.secureCookie, sameSite: 'lax' as const, path: '/api' };
const publicUser = ({ id, nome, login }: User) => ({ id, nome, login });

export function createApp(repository: Repository, options: { rateLimit?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') && req.get('origin') !== new URL(config.WEB_ORIGIN).origin) {
      return next(new HttpError(403, 'Origem não permitida.'));
    }
    next();
  });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', async (_req, res) => {
    try { await repository.health(); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ message: 'Banco de dados indisponível.' }); }
  });
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openapi, { swaggerOptions: { persistAuthorization: false }, customSiteTitle: 'API · Caderno de receitas' }));

  if (options.rateLimit !== false) {
    const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' } });
    app.use(['/api/auth/login', '/api/auth/register'], limiter);
  }
  const startSession = async (req: Request, res: Response, user: User) => {
    const previous = req.cookies[COOKIE];
    if (previous) await repository.deleteSession(tokenHash(previous));
    const token = newToken();
    await repository.createSession(tokenHash(token), user.id);
    res.cookie(COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  };
  app.post('/api/auth/register', async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await repository.createUser(input.nome, input.login, await hashPassword(input.senha));
    await startSession(req, res, user);
    res.status(201).json(publicUser(user));
  });
  // O hash falso mantém o custo de verificação semelhante para logins inexistentes.
  const dummyHash = hashPassword(newToken());
  app.post('/api/auth/login', async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await repository.findUser(input.login);
    const valid = await verifyPassword(input.senha, user?.senha ?? await dummyHash);
    if (!user || !valid) throw new HttpError(401, 'Login ou senha incorretos.');
    await startSession(req, res, user);
    res.json(publicUser(user));
  });
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies[COOKIE]) await repository.deleteSession(tokenHash(req.cookies[COOKIE]));
    res.clearCookie(COOKIE, cookieOptions).status(204).end();
  });
  app.use('/api', async (req, _res, next) => {
    const token = req.cookies[COOKIE];
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, 'Entre na sua conta para continuar.');
    const user = await repository.sessionUser(tokenHash(token));
    if (!user) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
    req.user = user;
    next();
  });
  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user!)));
  app.get('/api/categories', async (_req, res) => res.json(await repository.categories()));
  app.get('/api/recipes/stats', async (req, res) => res.json(await repository.stats(req.user!.id)));
  app.get('/api/recipes', async (req, res) => res.json(await repository.listRecipes(req.user!.id, searchSchema.parse(req.query))));
  app.get('/api/recipes/:id', async (req, res) => {
    const recipe = await repository.getRecipe(req.user!.id, idSchema.parse(req.params.id));
    if (!recipe) throw new HttpError(404, 'Receita não encontrada.');
    res.json(recipe);
  });
  const validateCategory = async (category: number | null) => {
    if (category !== null && !(await repository.categories()).some(item => item.id === category)) throw new HttpError(400, 'Categoria inválida.');
  };
  app.post('/api/recipes', async (req, res) => {
    const input = recipeSchema.parse(req.body);
    await validateCategory(input.id_categorias);
    const recipe = await repository.createRecipe(req.user!.id, input);
    res.status(201).location(`/api/recipes/${recipe.id}`).json(recipe);
  });
  app.put('/api/recipes/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = recipeSchema.parse(req.body);
    await validateCategory(input.id_categorias);
    const recipe = await repository.updateRecipe(req.user!.id, id, input);
    if (!recipe) throw new HttpError(404, 'Receita não encontrada.');
    res.json(recipe);
  });
  app.delete('/api/recipes/:id', async (req, res) => {
    const deleted = await repository.deleteRecipe(req.user!.id, idSchema.parse(req.params.id));
    if (!deleted) throw new HttpError(404, 'Receita não encontrada.');
    res.status(204).end();
  });
  app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Confira os campos informados.', errors: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
    }
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este login já está cadastrado.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Requisição muito grande.' });
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    console.error('Falha na API:', error.code ?? error.message);
    return res.status(500).json({ message: 'Não foi possível concluir a operação. Tente novamente.' });
  });
  return app;
}
