import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'
import { toast } from 'sonner'
import { Box, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const { setAuth, isAuthenticated } = useAuthStore()
    const navigate = useNavigate()

    useEffect(() => { if (isAuthenticated()) navigate('/') }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data } = await api.post('/auth/login', { email, password })
            setAuth(data.token, data.user)
            navigate('/')
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Login failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4 ring-2 ring-primary/30">
                        <Box className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">CoreInventory</h1>
                    <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                                className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                                placeholder="admin@coreinventory.com" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-medium text-foreground">Password</label>
                                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} required
                                    className="w-full px-3 py-2.5 pr-10 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                                    placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Don't have an account? <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
                        </p>
                    </form>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-4">Demo: admin@coreinventory.com / Admin@123</p>
            </div>
        </div>
    )
}
