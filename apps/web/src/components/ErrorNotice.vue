<script setup lang="ts">
defineProps<{ message?: string; fields?: Record<string, string> }>();
</script>

<template>
  <div v-if="message" class="error-notice" role="alert">
    <strong>{{ message }}</strong>
    <ul v-if="fields && Object.keys(fields).length">
      <li v-for="(value, key) in fields" :key="key">{{ value }}</li>
    </ul>
  </div>
</template>
