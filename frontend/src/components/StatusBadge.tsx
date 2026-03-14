import { cn } from '@/lib/utils'

type Status = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED'

const statusConfig: Record<Status, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
    WAITING: { label: 'Waiting', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    READY: { label: 'Ready', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    DONE: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    CANCELED: { label: 'Canceled', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function StatusBadge({ status }: { status: string }) {
    const cfg = statusConfig[status as Status] ?? { label: status, className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' }
    return (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.className)}>
            {cfg.label}
        </span>
    )
}

export function StockBadge({ total, reorderQty }: { total: number; reorderQty: number }) {
    if (total === 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-500/15 text-red-400 border-red-500/30">Out of Stock</span>
    if (total <= reorderQty) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-400 border-amber-500/30">Low Stock</span>
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">In Stock</span>
}
