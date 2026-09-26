<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import ErrorNotice from '../components/ErrorNotice.vue';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const fields = ref<Record<string, string>>({});
const loading = ref(false);
const schema = z
  .object({
    email: z.string().email('请输入有效邮箱'),
    password: z.string().min(8, '密码至少 8 位').max(128),
    confirmPassword: z.string()
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致'
  });

async function submit(): Promise<void> {
  error.value = '';
  fields.value = {};
  const parsed = schema.safeParse({
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fields.value[String(issue.path[0])] = issue.message;
    return;
  }
  loading.value = true;
  try {
    await auth.register(parsed.data.email, parsed.data.password);
    await router.push('/');
  } catch (caught) {
    if (caught instanceof ApiError) {
      error.value = caught.message;
      fields.value = caught.fields ?? {};
    } else error.value = '注册失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-copy">
      <p class="eyebrow">从第一本书开始</p>
      <h1>为阅读留一份不被量化的档案。</h1>
      <p>折角、批注、重读和读完后的情绪，会按真实时间保留下来。</p>
    </section>
    <form class="card auth-card" @submit.prevent="submit">
      <h2>创建账号</h2>
      <ErrorNotice :message="error" :fields="fields" />
      <label>
        邮箱
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        密码
        <input v-model="password" type="password" autocomplete="new-password" required />
      </label>
      <label>
        确认密码
        <input v-model="confirmPassword" type="password" autocomplete="new-password" required />
      </label>
      <button class="button button-primary button-block" type="submit" :disabled="loading">
        {{ loading ? '正在创建…' : '创建账号' }}
      </button>
      <p class="form-footnote">已有账号？<RouterLink to="/login">返回登录</RouterLink></p>
    </form>
  </main>
</template>
