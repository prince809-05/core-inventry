import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { toast } from 'sonner'
import { Box, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

type Step = 1 | 2 | 3

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>(1)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const sendOtp = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true)
        try {
            await api.post('/auth/forgot-password', { email })
            toast.success('OTP sent to your email')
            setStep(2)
        } catch { toast.error('Failed to send OTP') } finally { setLoading(false) }
    }

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true)
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp })
            setResetToken(data.resetToken)
            setStep(3)
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Invalid OTP')
        } finally { setLoading(false) }
    }

    const resetPassword = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true)
        try {
            await api.post('/auth/reset-password', { resetToken, newPassword })
            toast.success('Password reset successfully!')
            window.location.href = '/login'
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Reset failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4 ring-2 ring-primary/30">
                        <Box className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {step === 1 ? 'Enter your email to receive an OTP'
                            : step === 2 ? 'Enter the OTP sent to your email'
                                : 'Create a new password'}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                    {step === 1 && (
                        <form onSubmit={sendOtp} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                                    className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder="Enter your email" />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                                {loading ? 'Sending OTP...' : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
                            </button>
                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Remember your password? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
                            </p>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={verifyOtp} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">6-Digit OTP</label>
                                <input value={otp} onChange={e => setOtp(e.target.value)} type="text" required maxLength={6}
                                    className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm tracking-widest text-center"
                                    placeholder="••••••" />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                                {loading ? 'Verifying...' : <><span>Verify OTP</span><ArrowRight className="w-4 h-4" /></>}
                            </button>
                            <p className="text-center text-sm text-muted-foreground mt-4 cursor-pointer hover:underline" onClick={() => setStep(1)}>
                                Didn't receive code? Try again
                            </p>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={resetPassword} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                                <div className="relative">
                                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        type={showPw ? 'text' : 'password'} required
                                        className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        placeholder="Min 6 characters" />
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                                {loading ? 'Resetting...' : <><span>Reset Password</span><CheckCircle2 className="w-4 h-4" /></>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
