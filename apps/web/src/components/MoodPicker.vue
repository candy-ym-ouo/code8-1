<script setup lang="ts">
import { MOOD_LABELS, type MoodTag } from '../types/domain';
import { MOOD_TAGS } from '@paper-book-traces/shared';

const model = defineModel<MoodTag[]>({ required: true });
const props = withDefaults(defineProps<{ max?: number }>(), { max: 3 });

function toggle(tag: MoodTag): void {
  if (model.value.includes(tag)) {
    model.value = model.value.filter((item) => item !== tag);
  } else if (model.value.length < props.max) {
    model.value = [...model.value, tag];
  }
}
</script>

<template>
  <fieldset class="mood-picker">
    <legend>读完后，你更接近哪些感受？最多 {{ props.max }} 个</legend>
    <button
      v-for="tag in MOOD_TAGS"
      :key="tag"
      class="mood-chip"
      :class="{ selected: model.includes(tag) }"
      type="button"
      :aria-pressed="model.includes(tag)"
      @click="toggle(tag)"
    >
      {{ MOOD_LABELS[tag] }}
    </button>
  </fieldset>
</template>
