import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ConfirmModalProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmLabel?: string
    confirmVariant?: 'danger' | 'primary'
    loading?: boolean
}

export function ConfirmModal({
    open, onClose, onConfirm, title, description,
    confirmLabel = 'Confirm', confirmVariant = 'primary', loading = false
}: ConfirmModalProps) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-muted-foreground text-sm mb-6">{description}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onClose} disabled={loading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                            confirmVariant === 'danger'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
                                : 'bg-primary text-primary-foreground hover:bg-primary/80'
                        )}>
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
