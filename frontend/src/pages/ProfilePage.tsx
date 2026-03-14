import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'
import { toast } from 'sonner'
import { User, Mail, Shield, Calendar, LogOut } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function ProfilePage() {
    const { user, setAuth, logout } = useAuthStore()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')
    const [saving, setSaving] = useState(false)
    const [fullUser, setFullUser] = useState<any>(null)

    useEffect(() => {
        api.get('/auth/me').then(r => { setFullUser(r.data); setName(r.data.name) })
    }, [])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const { data } = await api.put('/auth/profile', { name })
            setAuth(localStorage.getItem('ci_token')!, data)
            toast.success('Profile updated')
        } catch { toast.error('Failed to update profile') } finally { setSaving(false) }
    }

    const handleLogout = () => { logout(); navigate('/login') }

    return (
        <div className="p-6 max-w-2xl">
            <div><h1 className="text-2xl font-bold text-foreground">My Profile</h1><p className="text-muted-foreground text-sm">Manage your account details</p></div>

            {/* Profile Card */}
            <div className="mt-6 bg-card border border-border rounded-xl overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                <div className="px-6 pb-6 -mt-10">
                    <div className="w-20 h-20 rounded-2xl bg-primary/20 border-4 border-card flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-primary">{(fullUser?.name || user?.name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{fullUser?.email || user?.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className="capitalize text-muted-foreground">{fullUser?.role || user?.role}</span>
                        </div>
                        {fullUser?.createdAt && (
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Member since {formatDate(fullUser.createdAt)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-4">Edit Profile</h2>
                <form onSubmit={handleUpdate} className="space-y-4 max-w-sm">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Display Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required
                            className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Password Reset Zone */}
            <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-2">Change Password</h2>
                <p className="text-sm text-muted-foreground mb-4">Send an OTP to your email to securely reset your password.</p>
                <button onClick={async () => {
                    const email = fullUser?.email || user?.email
                    if (!email) return;
                    setSaving(true)
                    try {
                        await api.post('/auth/forgot-password', { email })
                        toast.success('OTP sent to your email. You will be redirected.')
                        setTimeout(() => navigate('/forgot-password'), 2000)
                    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to send OTP') }
                    finally { setSaving(false) }
                }} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50">
                    <Shield className="w-4 h-4" /> Request Password Reset OTP
                </button>
            </div>

            {/* Danger Zone */}
            <div className="mt-6 bg-card border border-destructive/30 rounded-xl p-6">
                <h2 className="text-base font-semibold text-destructive mb-2">Session</h2>
                <p className="text-sm text-muted-foreground mb-4">Sign out from your current session.</p>
                <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </div>
    )
}
