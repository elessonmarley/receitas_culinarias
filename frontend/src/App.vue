<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { BookOpen, Search, Plus, Clock3, Users, ArrowUpRight, Grid2X2, List, SlidersHorizontal, LogOut, ChevronLeft, ChevronRight, Menu, X, Leaf, ChefHat, ArrowRight, LoaderCircle, NotebookPen, Check, CircleHelp } from '@lucide/vue';
import FoodArt from './components/FoodArt.vue';
import RecipeForm from './components/RecipeForm.vue';
import RecipeDetail from './components/RecipeDetail.vue';
import { api, ApiError } from './api';
import type { User, Category, Recipe, RecipePage, Stats } from './types';

const user = ref<User | null>(null);
const booting = ref(true);
const bootstrapError = ref('');
const registering = ref(false);
const auth = ref({ nome: '', login: '', senha: '' });
const authPending = ref(false);
const authError = ref('');
const categories = ref<Category[]>([]);
const stats = ref<Stats>({ total: 0, rapidas: 0, categorias: 0 });
const page = ref<RecipePage>({ data: [], total: 0, pagina: 1, limite: 9, paginas: 0 });
const loading = ref(false);
const error = ref('');
const search = ref('');
const category = ref<number | ''>('');
const quick = ref(false);
const order = ref('recentes');
const currentPage = ref(1);
const view = ref<'grid' | 'list'>('grid');
const mobileNav = ref(false);
const selected = ref<Recipe | null>(null);
const formOpen = ref(false);
const editing = ref<Recipe | null>(null);
const toast = ref('');
const logoutPending = ref(false);
let searchTimer: ReturnType<typeof setTimeout>;
let toastTimer: ReturnType<typeof setTimeout>;
let requestId = 0;
const hasFilters = computed(() => Boolean(search.value || category.value || quick.value));
const firstName = computed(() => user.value?.nome.split(' ')[0] ?? '');
const initials = computed(() => user.value?.nome.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase());
const shortCategories = computed(() => categories.value.filter(item => [1, 7, 5, 10, 9].includes(item.id)));
const categoryLabel = (id: number) => ({ 1: 'Bolos e tortas', 7: 'Massas', 5: 'Saladas e acompanhamentos', 10: 'Lanches', 9: 'Doces e sobremesas' })[id] ?? '';
function notify(message: string) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 4500); }

async function bootstrap() {
  booting.value = true; bootstrapError.value = '';
  try { user.value = await api<User>('/auth/me'); }
  catch (err) { if (!(err instanceof ApiError && err.status === 401)) bootstrapError.value = (err as Error).message; }
  finally { booting.value = false; }
}
async function switchAuth(createAccount: boolean, focusTab = false) {
  if (authPending.value) return;
  registering.value = createAccount;
  authError.value = '';
  auth.value.senha = '';
  if (focusTab) {
    await nextTick();
    document.getElementById(createAccount ? 'register-tab' : 'login-tab')?.focus();
  }
}
async function authenticate() {
  authPending.value = true; authError.value = '';
  try {
    user.value = await api<User>(registering.value ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(registering.value ? auth.value : { login: auth.value.login, senha: auth.value.senha }) });
    auth.value.senha = '';
  } catch (err) {
    authError.value = err instanceof ApiError && err.errors.length ? err.errors.map(item => item.message).join(' ') : (err as Error).message;
  } finally { authPending.value = false; }
}
function sessionExpired() {
  ++requestId; user.value = null; selected.value = null; formOpen.value = false;
  page.value = { data: [], total: 0, pagina: 1, limite: 9, paginas: 0 };
  authError.value = 'Sua sessão expirou. Entre novamente para continuar.';
}
async function loadRecipes() {
  if (!user.value) return;
  const id = ++requestId; loading.value = true; error.value = '';
  const query = new URLSearchParams({ busca: search.value, ordem: order.value, pagina: String(currentPage.value), limite: '9' });
  if (category.value) query.set('categoria', String(category.value));
  if (quick.value) query.set('tempo_maximo', '30');
  try {
    const result = await api<RecipePage>(`/recipes?${query}`);
    if (id === requestId) page.value = result;
  } catch (err) { if (id === requestId) error.value = (err as Error).message; }
  finally { if (id === requestId) loading.value = false; }
}
async function refresh() {
  try {
    const [categoryResult, statsResult] = await Promise.all([api<Category[]>('/categories'), api<Stats>('/recipes/stats')]);
    if (!user.value) return;
    categories.value = categoryResult; stats.value = statsResult;
    await loadRecipes();
  } catch (err) { error.value = (err as Error).message; }
}
watch(user, value => { if (value) { currentPage.value = 1; void refresh(); } });
watch([category, quick, order], () => { clearTimeout(searchTimer); currentPage.value = 1; void loadRecipes(); });
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; void loadRecipes(); }, 300); });
function navigatePage(value: number) { currentPage.value = value; void loadRecipes(); document.getElementById('collection-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function filterCategory(value: number | '') { category.value = value; quick.value = false; mobileNav.value = false; }
function resetFilters() { search.value = ''; category.value = ''; quick.value = false; }
function newRecipe() { editing.value = null; formOpen.value = true; }
function editRecipe(recipe: Recipe) { selected.value = null; editing.value = recipe; formOpen.value = true; }
async function saved(recipe: Recipe) {
  const wasEditing = !!editing.value;
  formOpen.value = false; selected.value = recipe;
  currentPage.value = 1; notify(wasEditing ? 'Receita atualizada com carinho.' : 'Mais uma delícia no seu caderno!');
  await refresh();
}
async function deleted() { selected.value = null; currentPage.value = 1; notify('Receita excluída do seu caderno.'); await refresh(); }
async function logout() {
  logoutPending.value = true;
  try {
    await api('/auth/logout', { method: 'POST' });
    user.value = null; ++requestId; resetFilters(); mobileNav.value = false;
    page.value = { data: [], total: 0, pagina: 1, limite: 9, paginas: 0 }; authError.value = '';
  } catch (err) { notify((err as Error).message); }
  finally { logoutPending.value = false; }
}
onMounted(() => { void bootstrap(); window.addEventListener('session-expired', sessionExpired); });
onUnmounted(() => { clearTimeout(searchTimer); clearTimeout(toastTimer); window.removeEventListener('session-expired', sessionExpired); });
</script>

<template>
  <div v-if="booting" class="boot-screen"><BookOpen :size="36" /><span>Abrindo seu caderno…</span><LoaderCircle class="spin" :size="20" /></div>
  <main v-else-if="!user" class="auth-layout">
    <section class="auth-story"><a class="brand" href="/" aria-label="Caderno, página inicial"><span class="brand-icon"><BookOpen :size="25" :stroke-width="1.7" /></span><span>caderno<span class="brand-dot">.</span><small>RECEITAS & MEMÓRIAS</small></span></a><div class="auth-story-content"><span class="eyebrow">DA SUA COZINHA PARA A VIDA</span><h1>As melhores receitas<br />têm uma <em>história.</em></h1><p>Um lugar só seu para guardar sabores,<br />organizar ideias e criar novas memórias.</p><div class="auth-illustration"><FoodArt :category="5" /><span class="handwritten">feito com carinho ↗</span></div></div><footer>Um pouco de organização. Uma boa pitada de afeto.</footer></section>
    <section class="auth-panel"><div class="auth-form-wrap"><span class="auth-mini-icon"><NotebookPen :size="25" :stroke-width="1.5" /></span><span class="eyebrow">SEU CADERNO DIGITAL</span><h2>{{ registering ? 'Comece uma boa história.' : 'Que bom ter você aqui.' }}</h2><p>{{ registering ? 'Crie sua conta e guarde sua primeira receita.' : 'Entre para abrir seu caderno de receitas.' }}</p>
      <div class="auth-tabs" role="tablist" aria-label="Acesso à conta" @keydown.right.prevent="switchAuth(!registering, true)" @keydown.left.prevent="switchAuth(!registering, true)" @keydown.home.prevent="switchAuth(false, true)" @keydown.end.prevent="switchAuth(true, true)">
        <button id="login-tab" type="button" role="tab" :aria-selected="!registering" aria-controls="auth-fields" :tabindex="registering ? -1 : 0" :disabled="authPending" @click="switchAuth(false)">Entrar</button>
        <button id="register-tab" type="button" role="tab" :aria-selected="registering" aria-controls="auth-fields" :tabindex="registering ? 0 : -1" :disabled="authPending" @click="switchAuth(true)">Cadastrar</button>
      </div>
      <div id="auth-fields" role="tabpanel" :aria-labelledby="registering ? 'register-tab' : 'login-tab'">
        <div v-if="bootstrapError" class="error-banner" role="alert">{{ bootstrapError }}<button class="text-button" @click="bootstrap">Tentar novamente</button></div>
        <form @submit.prevent="authenticate"><p v-if="authError" class="error-banner" role="alert">{{ authError }}</p><label v-if="registering">Seu nome<input v-model="auth.nome" autocomplete="name" required minlength="2" maxlength="100" placeholder="Como podemos chamar você?" /></label><label>Login ou e-mail<input v-model="auth.login" autocomplete="username" required minlength="3" maxlength="100" placeholder="Ex.: maria ou maria@email.com" /></label><label>Senha<input v-model="auth.senha" :autocomplete="registering ? 'new-password' : 'current-password'" type="password" required minlength="8" maxlength="128" :placeholder="registering ? 'Pelo menos 8 caracteres' : 'Sua senha'" /></label><button class="button primary auth-submit" :disabled="authPending"><LoaderCircle v-if="authPending" :size="18" class="spin" />{{ authPending ? 'Só um instante…' : registering ? 'Criar meu caderno' : 'Abrir meu caderno' }}<ArrowRight v-if="!authPending" :size="18" /></button></form>
      </div>
    </div><footer>FEITO PARA QUEM AMA COZINHAR.</footer></section>
  </main>
  <div v-else class="app-shell">
    <button v-if="mobileNav" class="nav-overlay" aria-label="Fechar menu" @click="mobileNav = false" />
    <aside class="sidebar" :class="{ 'is-open': mobileNav }"><a href="/" class="brand" @click.prevent="resetFilters"><span class="brand-icon"><BookOpen :size="25" :stroke-width="1.7" /></span><span>caderno<span class="brand-dot">.</span><small>RECEITAS & MEMÓRIAS</small></span></a><button class="icon-button mobile-close" aria-label="Fechar menu" @click="mobileNav = false"><X :size="20" /></button>
      <div class="sidebar-content"><span class="nav-caption">MEU CADERNO</span><nav aria-label="Receitas"><button :class="['nav-item', { active: !category && !quick }]" @click="filterCategory('')"><BookOpen :size="19" />Todas as receitas<span class="nav-count">{{ stats.total }}</span></button><button :class="['nav-item', { active: quick }]" @click="category = ''; quick = true; mobileNav = false"><Clock3 :size="19" />Práticas e rápidas<span class="tiny-dot" /></button></nav>
      <div class="category-nav"><span class="nav-caption">POR CATEGORIA</span><nav aria-label="Categorias"><button v-for="item in shortCategories" :key="item.id" :class="['nav-item category-link', { active: category === item.id }]" @click="filterCategory(item.id)"><span class="category-dot" :class="`dot-${item.id}`" />{{ categoryLabel(item.id) }}</button></nav></div>
      <div class="sidebar-note"><span class="note-icon"><Leaf :size="23" :stroke-width="1.5" /></span><p>Receita boa é aquela<br />que a gente <em>guarda.</em></p><span>O resto é só repetir a dose.</span><svg viewBox="0 0 140 18" aria-hidden="true"><path d="M2 11Q62 0 138 8M20 17Q76 7 118 14" stroke="currentColor" fill="none" stroke-linecap="round" /></svg></div></div>
      <div class="sidebar-bottom"><a href="/api/docs" target="_blank" rel="noopener"><CircleHelp :size="17" />Documentação da API<ArrowUpRight :size="14" /></a><div class="profile"><span class="avatar">{{ initials }}</span><div><strong>{{ firstName }}</strong><span>Meu espaço de receitas</span></div><button class="icon-button" aria-label="Sair da conta" :disabled="logoutPending" @click="logout"><LoaderCircle v-if="logoutPending" class="spin" :size="17" /><LogOut v-else :size="17" /></button></div></div>
    </aside>
    <div class="workspace"><header class="topbar"><div><button class="icon-button mobile-menu" aria-label="Abrir menu" @click="mobileNav = true"><Menu :size="22" /></button><span class="breadcrumb">Meu espaço <ChevronRight :size="13" /><strong>Receitas</strong></span></div><span class="topbar-message"><span class="status-dot" />Um lugar para os seus melhores sabores.</span><span class="mobile-avatar avatar">{{ initials }}</span></header>
      <main class="main-content"><div class="page-heading"><div><span class="eyebrow">BEM-VINDO À SUA COZINHA</span><h1>Meu caderno de receitas<span>.</span></h1><p>Os sabores que você ama, todos no mesmo lugar.</p></div><button class="button primary add-button" @click="newRecipe"><Plus :size="19" />Nova receita</button></div>
        <section class="welcome-banner" aria-label="Boas-vindas"><div class="welcome-copy"><span class="banner-overline"><span />UM POUCO DE INSPIRAÇÃO</span><h2>Guarde o sabor.<br />Reviva a <em>história.</em></h2><p>Do almoço de domingo àquela invenção que deu certo.<br class="desktop-break" /> Toda receita merece um lugar especial.</p><button class="text-button" @click="newRecipe">Qual vai ser a próxima receita?<ArrowRight :size="17" /></button></div><div class="banner-art"><div class="art-orbit"/><FoodArt :category="5" /><span class="art-sticker"><Leaf :size="18" />caseiro é melhor</span><span class="art-spark spark-one">✳</span><span class="art-spark spark-two">✧</span></div></section>
        <div class="stats-row"><div class="stat"><span class="stat-icon terracotta"><BookOpen :size="20" :stroke-width="1.5" /></span><span><strong>{{ stats.total }}</strong><span>receitas no caderno</span></span></div><div class="stat"><span class="stat-icon green"><Clock3 :size="20" :stroke-width="1.5" /></span><span><strong>{{ stats.rapidas }}</strong><span>prontas em até 30 min</span></span></div><div class="stat"><span class="stat-icon ochre"><ChefHat :size="21" :stroke-width="1.5" /></span><span><strong>{{ stats.categorias }}</strong><span>categorias para explorar</span></span></div><span class="stats-note">Sua coleção tem um tempero único.<Leaf :size="19" :stroke-width="1.3" /></span></div>
        <section class="collection" aria-labelledby="collection-title"><div class="collection-heading"><h2 id="collection-title">{{ quick ? 'Práticas e rápidas' : category ? categoryLabel(Number(category)) || 'Suas receitas' : 'Todas as receitas' }}<span>{{ page.total }}</span></h2><div class="view-switch" aria-label="Visualização"><button :class="{ active: view === 'grid' }" aria-label="Visualizar em grade" :aria-pressed="view === 'grid'" @click="view = 'grid'"><Grid2X2 :size="17" /></button><button :class="{ active: view === 'list' }" aria-label="Visualizar em lista" :aria-pressed="view === 'list'" @click="view = 'list'"><List :size="19" /></button></div></div>
          <div class="toolbar"><div class="search-input"><Search :size="18" /><input v-model="search" aria-label="Buscar receitas" placeholder="Busque uma receita ou ingrediente…" /><button v-if="search" class="icon-button" aria-label="Limpar busca" @click="search = ''"><X :size="15" /></button></div><div class="select-filter"><SlidersHorizontal :size="16" /><select v-model="category" aria-label="Filtrar por categoria"><option value="">Todas as categorias</option><option v-for="item in categories" :key="item.id" :value="item.id">{{ item.nome }}</option></select></div><select v-model="order" class="sort-select" aria-label="Ordenar receitas"><option value="recentes">Mais recentes</option><option value="nome">Nome: A a Z</option><option value="rapidas">Menor tempo</option></select></div>
          <div v-if="hasFilters" class="active-filters"><span v-if="quick"><Clock3 :size="13" />Até 30 minutos</span><span v-if="search">“{{ search }}”</span><button @click="resetFilters">Limpar filtros<X :size="13" /></button></div>
          <div v-if="error" class="collection-error" role="alert"><p>{{ error }}</p><button class="button secondary" @click="refresh">Tentar novamente</button></div>
          <div v-else-if="loading" class="recipe-grid" aria-label="Carregando receitas" aria-busy="true"><div v-for="i in 3" :key="i" class="skeleton-card"><div/><span/><span/></div></div>
          <div v-else-if="page.data.length" :class="['recipe-grid', { 'list-view': view === 'list' }]"><button v-for="recipe in page.data" :key="recipe.id" class="recipe-card" @click="selected = recipe"><div class="recipe-cover"><FoodArt :category="recipe.id_categorias" /><span class="cover-arrow"><ArrowUpRight :size="19" /></span><span v-if="recipe.tempo_preparo_minutos <= 15" class="quick-badge"><Clock3 :size="11" />RAPIDINHA</span></div><div class="recipe-card-content"><span class="category-tag" :class="`tag-${recipe.id_categorias}`">{{ recipe.categoria ?? 'Sem categoria' }}</span><h3>{{ recipe.nome }}</h3><p>{{ recipe.ingredientes.split('\n').filter(Boolean).slice(0, 3).map(item => item.replace(/^\d+[\d/.,\s]*/, '')).join(' · ') }}</p><div class="recipe-meta"><span><Clock3 :size="14" />{{ recipe.tempo_preparo_minutos }} min</span><span><Users :size="14" />{{ recipe.porcoes }} {{ recipe.porcoes === 1 ? 'porção' : 'porções' }}</span><BookOpen :size="15" class="card-book" /></div></div></button></div>
          <div v-else class="empty-state"><span><NotebookPen :size="35" :stroke-width="1.3" /></span><h3>{{ hasFilters ? 'Nenhuma receita por aqui.' : 'Seu caderno está esperando a primeira receita.' }}</h3><p>{{ hasFilters ? 'Experimente outro ingrediente ou ajuste os filtros.' : 'Comece com aquele prato que tem gosto de casa.' }}</p><button class="button secondary" @click="hasFilters ? resetFilters() : newRecipe()">{{ hasFilters ? 'Limpar filtros' : 'Adicionar minha primeira receita' }}<ArrowRight :size="16" /></button></div>
          <div v-if="page.total && !loading && !error" class="collection-footer"><span>Mostrando {{ (page.pagina - 1) * page.limite + 1 }}–{{ Math.min(page.pagina * page.limite, page.total) }} de {{ page.total }} {{ page.total === 1 ? 'receita' : 'receitas' }}</span><div v-if="page.paginas > 1" class="pagination"><button class="icon-button" aria-label="Página anterior" :disabled="currentPage === 1" @click="navigatePage(currentPage - 1)"><ChevronLeft :size="18" /></button><span>Página {{ currentPage }} de {{ page.paginas }}</span><button class="icon-button" aria-label="Próxima página" :disabled="currentPage === page.paginas" @click="navigatePage(currentPage + 1)"><ChevronRight :size="18" /></button></div><span v-else class="collection-end">Bons ingredientes. Boas memórias.</span></div>
        </section><footer class="page-footer"><span>caderno<span>.</span></span><p>Receitas feitas para guardar. Memórias feitas para compartilhar.</p><Leaf :size="17" :stroke-width="1.4" /></footer>
      </main>
    </div>
    <RecipeForm v-if="formOpen" :recipe="editing" :categories="categories" @close="formOpen = false" @saved="saved" />
    <RecipeDetail v-if="selected" :recipe="selected" @close="selected = null" @edit="editRecipe" @deleted="deleted" />
  </div>
  <Transition name="toast"><div v-if="toast" class="toast-message" role="status"><Check :size="18" />{{ toast }}<button class="icon-button" aria-label="Fechar notificação" @click="toast = ''"><X :size="16" /></button></div></Transition>
</template>
