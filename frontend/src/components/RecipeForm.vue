<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { X, Plus, Save, LoaderCircle, ChefHat } from '@lucide/vue';
import { api, ApiError } from '../api';
import type { Category, Recipe, RecipeInput } from '../types';
const props = defineProps<{ recipe: Recipe | null; categories: Category[] }>();
const emit = defineEmits<{ close: []; saved: [recipe: Recipe] }>();
const dialog = ref<HTMLDialogElement>();
const saving = ref(false);
const error = ref('');
const fields = ref<{ field: string; message: string }[]>([]);
const form = ref<RecipeInput>(props.recipe ? {
  nome: props.recipe.nome, id_categorias: props.recipe.id_categorias,
  tempo_preparo_minutos: props.recipe.tempo_preparo_minutos, porcoes: props.recipe.porcoes,
  ingredientes: props.recipe.ingredientes, modo_preparo: props.recipe.modo_preparo,
} : { nome: '', id_categorias: null, tempo_preparo_minutos: 30, porcoes: 2, ingredientes: '', modo_preparo: '' });
onMounted(() => dialog.value?.showModal());
async function save() {
  saving.value = true; error.value = ''; fields.value = [];
  try {
    const recipe = await api<Recipe>(props.recipe ? `/recipes/${props.recipe.id}` : '/recipes', { method: props.recipe ? 'PUT' : 'POST', body: JSON.stringify(form.value) });
    emit('saved', recipe);
  } catch (err) {
    error.value = (err as Error).message;
    if (err instanceof ApiError) fields.value = err.errors;
  } finally { saving.value = false; }
}
function close(event?: Event) { if (saving.value) { event?.preventDefault(); return; } emit('close'); }
</script>

<template>
  <dialog ref="dialog" class="modal form-modal" aria-labelledby="form-title" @cancel="close">
    <header class="modal-header"><div><span class="eyebrow"><ChefHat :size="14" /> DIRETO DA SUA COZINHA</span><h2 id="form-title">{{ recipe ? 'Editar receita' : 'Uma nova delícia' }}</h2></div><button class="icon-button" aria-label="Fechar formulário" :disabled="saving" @click="close()"><X :size="21" /></button></header>
    <form @submit.prevent="save">
      <div v-if="error" class="error-banner" role="alert">{{ error }}<ul v-if="fields.length"><li v-for="field in fields" :key="field.field">{{ field.message }}</li></ul></div>
      <label><span id="recipe-name-label">Nome da receita</span><span class="required" aria-hidden="true">*</span><input v-model="form.nome" aria-labelledby="recipe-name-label" required minlength="2" maxlength="45" placeholder="Ex.: Bolo de cenoura da vovó" autofocus /></label>
      <label><span id="recipe-category-label">Categoria</span><select v-model="form.id_categorias" aria-labelledby="recipe-category-label"><option :value="null">Sem categoria</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.nome }}</option></select></label>
      <div class="form-row"><label><span id="recipe-time-label">Tempo de preparo (min)</span><span class="required" aria-hidden="true">*</span><input v-model.number="form.tempo_preparo_minutos" aria-labelledby="recipe-time-label" type="number" min="1" max="10080" required /></label><label><span id="recipe-servings-label">Porções</span><span class="required" aria-hidden="true">*</span><input v-model.number="form.porcoes" aria-labelledby="recipe-servings-label" type="number" min="1" max="1000" required /></label></div>
      <label><span id="recipe-ingredients-label">Ingredientes</span><span class="required" aria-hidden="true">*</span><span id="ingredients-hint" class="field-hint">Um ingrediente por linha, com a quantidade.</span><textarea v-model="form.ingredientes" aria-labelledby="recipe-ingredients-label" aria-describedby="ingredients-hint" rows="5" required minlength="3" maxlength="20000" placeholder="2 xícaras de farinha de trigo&#10;3 ovos&#10;1 colher de fermento" /></label>
      <label><span id="recipe-steps-label">Modo de preparo</span><span class="required" aria-hidden="true">*</span><span id="steps-hint" class="field-hint">Escreva cada etapa em uma nova linha.</span><textarea v-model="form.modo_preparo" aria-labelledby="recipe-steps-label" aria-describedby="steps-hint" rows="5" required minlength="3" maxlength="30000" placeholder="Preaqueça o forno a 180 °C.&#10;Misture os ingredientes em uma tigela…" /></label>
      <footer class="modal-footer"><button type="button" class="button secondary" :disabled="saving" @click="close()">Cancelar</button><button class="button primary" :disabled="saving"><LoaderCircle v-if="saving" :size="17" class="spin" /><Save v-else-if="recipe" :size="17" /><Plus v-else :size="17" />{{ saving ? 'Salvando…' : 'Salvar receita' }}</button></footer>
    </form>
  </dialog>
</template>
