import { z } from 'zod';

export const registerSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.').max(100),
  login: z.string().trim().toLowerCase().min(3).max(100).regex(/^[a-z0-9._@+-]+$/, 'Use letras, números, ponto, @, +, - ou _.'),
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
}).strict();
export const loginSchema = registerSchema.pick({ login: true, senha: true });
export const recipeSchema = z.object({
  nome: z.string().trim().min(2, 'Dê um nome à receita.').max(45, 'Use até 45 caracteres.'),
  id_categorias: z.number().int().positive().nullable(),
  tempo_preparo_minutos: z.number().int().min(1).max(10080),
  porcoes: z.number().int().min(1).max(1000),
  ingredientes: z.string().trim().min(3, 'Informe os ingredientes.').max(20000),
  modo_preparo: z.string().trim().min(3, 'Informe o modo de preparo.').max(30000),
}).strict();
export type RecipeInput = z.infer<typeof recipeSchema>;
export const idSchema = z.coerce.number().int().positive();
export const searchSchema = z.object({
  busca: z.string().trim().max(100).default(''),
  categoria: z.coerce.number().int().positive().optional(),
  tempo_maximo: z.coerce.number().int().positive().max(10080).optional(),
  ordem: z.enum(['recentes', 'nome', 'rapidas']).default('recentes'),
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(9),
});
export type RecipeSearch = z.infer<typeof searchSchema>;
