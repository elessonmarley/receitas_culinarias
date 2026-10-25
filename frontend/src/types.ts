export interface User { id: number; nome: string; login: string }
export interface Category { id: number; nome: string }
export interface RecipeInput { nome: string; id_categorias: number | null; tempo_preparo_minutos: number; porcoes: number; ingredientes: string; modo_preparo: string }
export interface Recipe extends RecipeInput { id: number; id_usuarios: number; categoria: string | null; criado_em: string; alterado_em: string }
export interface RecipePage { data: Recipe[]; total: number; pagina: number; limite: number; paginas: number }
export interface Stats { total: number; rapidas: number; categorias: number }
