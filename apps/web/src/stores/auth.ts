import { defineStore } from 'pinia';
import { authApi } from '../api';
import type { User } from '../types/domain';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    initialized: false,
    loading: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user)
  },
  actions: {
    async initialize(): Promise<void> {
      if (this.initialized) return;
      this.loading = true;
      try {
        const result = await authApi.me();
        this.user = result.user;
      } catch {
        this.user = null;
      } finally {
        this.loading = false;
        this.initialized = true;
      }
    },
    async login(email: string, password: string): Promise<void> {
      const result = await authApi.login(email, password);
      this.user = result.user;
      this.initialized = true;
    },
    async register(email: string, password: string): Promise<void> {
      const result = await authApi.register(email, password);
      this.user = result.user;
      this.initialized = true;
    },
    async logout(): Promise<void> {
      try {
        await authApi.logout();
      } finally {
        this.user = null;
      }
    }
  }
});
