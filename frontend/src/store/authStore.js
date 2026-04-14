import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      // Derived
      isAuthenticated: () => !!get().accessToken,

      login: async (credentials) => {
        set({ isLoading: true });
        const { data } = await authService.login(credentials);
        const { user, accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken, isLoading: false });
        return user;
      },

      register: async (payload) => {
        set({ isLoading: true });
        const { data } = await authService.register(payload);
        const { user, accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken, isLoading: false });
        return user;
      },

      logout: async () => {
        try { await authService.logout(); } catch { /* ignore */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setUser: (user) => set({ user }),

      updateSession: ({ user, accessToken, refreshToken }) => {
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          set({ accessToken });
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
          set({ refreshToken });
        }
        if (user) {
          set({ user });
        }
      },
    }),
    {
      name: 'auth-store',
      // Only persist non-sensitive user info to localStorage
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
