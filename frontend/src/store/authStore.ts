import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: string
    name: string
    email: string
    role: string
}

interface AuthState {
    token: string | null
    user: User | null
    setAuth: (token: string, user: User) => void
    logout: () => void
    isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            setAuth: (token, user) => {
                localStorage.setItem('ci_token', token)
                set({ token, user })
            },
            logout: () => {
                localStorage.removeItem('ci_token')
                localStorage.removeItem('ci_user')
                set({ token: null, user: null })
            },
            isAuthenticated: () => !!get().token,
        }),
        { name: 'ci_auth', partialize: (state) => ({ token: state.token, user: state.user }) }
    )
)
