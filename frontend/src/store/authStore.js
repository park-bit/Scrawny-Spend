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
        set({ isLoading: false });
        // Since OTP is enabled, register does NOT return tokens immediately
        return data.data; 
      },

      verifyOtp: async (payload) => {
        set({ isLoading: true });
        const { data } = await authService.verifyOtp(payload);
        const { user, accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken, isLoading: false });
        return user;
      },

      requestPasswordReset: async (payload) => {
        set({ isLoading: true });
        const { data } = await authService.requestPasswordReset(payload);
        set({ isLoading: false });
        return data;
      },

      resetPassword: async (payload) => {
        set({ isLoading: true });
        const { data } = await authService.resetPassword(payload);
        set({ isLoading: false });
        return data;
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
