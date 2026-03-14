import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Move {
    id: string; type: string; reference: string; qtyChange: number; qtyBefore: number; qtyAfter: number; createdAt: string
    product: { name: string; sku: string }
    fromLoc?: { name: string; warehouse: { name: string } }
    toLoc?: { name: string; warehouse: { name: string } }
}

export default function StockMovesPage() {
    const [moves, setMoves] = useState<Move[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const LIMIT = 50

    const fetchMoves = useCallback(async () => {
        setLoading(true)
        const params: any = { page, limit: LIMIT }
        if (filterType) params.type = filterType
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate
        const { data } = await api.get('/stock-moves', { params })
        setMoves(data.data); setTotal(data.total); setLoading(false)
    }, [filterType, startDate, endDate, page])

    useEffect(() => { fetchMoves() }, [fetchMoves])

    const totalPages = Math.ceil(total / LIMIT)

    return (
        <div className="p-6 space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Stock Ledger</h1>
                <p className="text-muted-foreground text-sm">Complete audit log of all stock movements</p>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                    className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">All Types</option>
                    {['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex items-center gap-2">
                    <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }}
                        className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <span className="text-muted-foreground text-sm">to</span>
                    <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }}
                        className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <span className="text-xs text-muted-foreground ml-auto">{total} total moves</span>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                {['Date', 'Type', 'Reference', 'Product', 'From', 'To', 'Change', 'Before', 'After'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? [...Array(8)].map((_, i) => <tr key={i}><td colSpan={9}><div className="h-4 mx-4 my-3 bg-secondary/50 rounded animate-pulse" /></td></tr>)
                                : moves.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No moves found for these filters</td></tr>
                                    : moves.map(m => (
                                        <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">{formatDateTime(m.createdAt)}</td>
                                            <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${m.type === 'RECEIPT' ? 'bg-emerald-500/15 text-emerald-400'
                                                    : m.type === 'DELIVERY' ? 'bg-red-500/15 text-red-400'
                                                        : m.type === 'TRANSFER' ? 'bg-blue-500/15 text-blue-400'
                                                            : 'bg-amber-500/15 text-amber-400'
                                                }`}>{m.type}</span></td>
                                            <td className="px-4 py-3 font-mono text-xs text-primary">{m.reference}</td>
                                            <td className="px-4 py-3"><div className="font-medium text-foreground text-xs">{m.product.name}</div><div className="text-xs text-muted-foreground">{m.product.sku}</div></td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{m.fromLoc ? `${m.fromLoc.warehouse.name} › ${m.fromLoc.name}` : '—'}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{m.toLoc ? `${m.toLoc.warehouse.name} › ${m.toLoc.name}` : '—'}</td>
                                            <td className="px-4 py-3 font-bold"><span className={m.qtyChange > 0 ? 'text-emerald-400' : 'text-red-400'}>{m.qtyChange > 0 ? '+' : ''}{m.qtyChange}</span></td>
                                            <td className="px-4 py-3 text-muted-foreground">{m.qtyBefore}</td>
                                            <td className="px-4 py-3 text-foreground font-medium">{m.qtyAfter}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1 rounded bg-secondary text-sm text-foreground hover:bg-secondary/80 disabled:opacity-40">Prev</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="px-3 py-1 rounded bg-secondary text-sm text-foreground hover:bg-secondary/80 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
