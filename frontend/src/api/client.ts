import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ci_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        // Only redirect to login for 401s if we're not ACTUALLY trying to login or reset password
        const url = err.config?.url || ''
        const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/verify-otp') || url.includes('/auth/reset-password')

        if (err.response?.status === 401 && !isAuthRoute) {
            localStorage.removeItem('ci_token')
            localStorage.removeItem('ci_user')
            // Don't hard redirect here if we are already on the login page to prevent refresh loops
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(err)
    }
)

export default api
