<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { X, Clock3, Users, Pencil, Printer, Trash2, ArrowLeft, LoaderCircle } from '@lucide/vue';
import FoodArt from './FoodArt.vue';
import { api } from '../api';
import type { Recipe } from '../types';
const props = defineProps<{ recipe: Recipe }>();
const emit = defineEmits<{ close: []; edit: [recipe: Recipe]; deleted: [] }>();
const dialog = ref<HTMLDialogElement>();
const confirming = ref(false);
const deleting = ref(false);
const error = ref('');
const ingredients = computed(() => props.recipe.ingredientes.split('\n').map(item => item.trim()).filter(Boolean));
const steps = computed(() => props.recipe.modo_preparo.split('\n').map(item => item.trim()).filter(Boolean));
onMounted(() => dialog.value?.showModal());
function close(event?: Event) { if (deleting.value) { event?.preventDefault(); return; } emit('close'); }
async function remove() {
  deleting.value = true; error.value = '';
  try { await api(`/recipes/${props.recipe.id}`, { method: 'DELETE' }); emit('deleted'); }
  catch (err) { error.value = (err as Error).message; }
  finally { deleting.value = false; }
}
function print() { window.print(); }
</script>

<template>
  <dialog ref="dialog" class="modal detail-modal" aria-labelledby="detail-title" @cancel="close">
    <div class="detail-art"><FoodArt :category="recipe.id_categorias" /><button class="icon-button close-detail" aria-label="Fechar receita" :disabled="deleting" @click="close()"><X :size="22" /></button><span class="art-label">FEITO EM CASA, COM CARINHO.</span></div>
    <div class="detail-content">
      <span class="category-tag">{{ recipe.categoria ?? 'Sem categoria' }}</span><h2 id="detail-title">{{ recipe.nome }}</h2>
      <div class="recipe-meta"><span><Clock3 :size="16" />{{ recipe.tempo_preparo_minutos }} min de preparo</span><span><Users :size="16" />{{ recipe.porcoes }} {{ recipe.porcoes === 1 ? 'porção' : 'porções' }}</span></div>
      <div class="detail-actions"><button class="button secondary small" @click="emit('edit', recipe)"><Pencil :size="15" />Editar receita</button><button class="button secondary small" @click="print"><Printer :size="15" />Imprimir</button><button class="icon-button danger" aria-label="Excluir receita" @click="confirming = true"><Trash2 :size="17" /></button></div>
      <section v-if="confirming" class="delete-confirm" aria-label="Confirmar exclusão"><strong>Excluir esta receita?</strong><p>Ela será removida do seu caderno. Esta ação não pode ser desfeita.</p><p v-if="error" class="error-banner" role="alert">{{ error }}</p><div><button class="button secondary small" :disabled="deleting" @click="confirming = false"><ArrowLeft :size="15" />Manter receita</button><button class="button destructive small" :disabled="deleting" @click="remove"><LoaderCircle v-if="deleting" class="spin" :size="15" />{{ deleting ? 'Excluindo…' : 'Sim, excluir' }}</button></div></section>
      <div class="recipe-body"><section><h3>Ingredientes<span>{{ ingredients.length }} itens</span></h3><p class="ingredients-hint">Marque o que já separou.</p><ul class="ingredients"><li v-for="(ingredient, index) in ingredients" :key="index"><label><input type="checkbox" /><span>{{ ingredient }}</span></label></li></ul></section><section><h3>Modo de preparo</h3><ol class="steps"><li v-for="(step, index) in steps" :key="index"><span class="step-number">{{ String(index + 1).padStart(2, '0') }}</span><p>{{ step }}</p></li></ol></section></div>
      <div class="detail-signoff">Uma receita, muitas boas memórias. <span>Caderno</span></div>
    </div>
  </dialog>
</template>
