import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'
import { toast } from 'sonner'
import { Box, ArrowRight } from 'lucide-react'

export default function SignupPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { setAuth } = useAuthStore()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data } = await api.post('/auth/signup', { name, email, password })
            setAuth(data.token, data.user)
            toast.success('Account created!')
            navigate('/')
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Signup failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4 ring-2 ring-primary/30">
                        <Box className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                    <p className="text-muted-foreground text-sm mt-1">Join CoreInventory</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {[{ label: 'Full Name', value: name, set: setName, type: 'text', ph: 'John Doe' },
                        { label: 'Email', value: email, set: setEmail, type: 'email', ph: 'john@example.com' },
                        { label: 'Password', value: password, set: setPassword, type: 'password', ph: 'Min 6 characters' }
                        ].map(({ label, value, set, type, ph }) => (
                            <div key={label}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-medium text-foreground">{label}</label>
                                    {label === 'Password' && (
                                        <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                                    )}
                                </div>
                                <input value={value} onChange={e => set(e.target.value)} type={type} required
                                    className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder={ph} />
                            </div>
                        ))}
                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {loading ? 'Creating...' : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
