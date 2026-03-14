import { useEffect, useState, useCallback } from 'react'
import api from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import {
    Package, AlertTriangle, XCircle, ClipboardList, Truck, ArrowLeftRight, RefreshCw
} from 'lucide-react'

interface KPIs {
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    pendingReceipts: number
    pendingDeliveries: number
    scheduledTransfers: number
}

interface Move {
    id: string; type: string; reference: string; qtyChange: number; qtyBefore: number; qtyAfter: number; createdAt: string
    product: { name: string; sku: string }
    fromLoc?: { name: string; warehouse: { name: string } }
    toLoc?: { name: string; warehouse: { name: string } }
}

const KPICard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-800 rounded-xl p-5 flex-1 min-w-[150px] shadow-sm transition-colors`}>
        <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-sm font-medium">{label}</span>
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
        </div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
    </div>
)

export default function DashboardPage() {
    const [kpis, setKpis] = useState<KPIs | null>(null)
    const [moves, setMoves] = useState<Move[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    const fetchDashboard = useCallback(async () => {
        try {
            const { data } = await api.get('/dashboard')
            setKpis(data.kpis)
            setMoves(data.recentMoves)
            setLastUpdated(new Date())
        } catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchDashboard()
        const interval = setInterval(fetchDashboard, 5000)
        return () => clearInterval(interval)
    }, [fetchDashboard])

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
    )

    return (
        <div className="p-6 space-y-6">
            {/* KPI Cards / Over View */}
            {kpis && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 p-5 shadow-sm transition-colors">
                    <h2 className="text-sm font-semibold text-foreground dark:text-slate-200 mb-4">Over View</h2>
                    <div className="flex flex-wrap gap-4">
                        <KPICard icon={Package} label="Total Products" value={kpis.totalProducts} color="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300" />
                        <KPICard icon={Truck} label="Orders" value={kpis.pendingDeliveries} color="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300" />
                        <KPICard icon={ArrowLeftRight} label="Total Stock" value={kpis.totalProducts * 10} color="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300" />
                        <KPICard icon={XCircle} label="Out of Stock" value={kpis.outOfStockCount} color="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" />
                        <KPICard icon={ClipboardList} label="Receipts" value={kpis.pendingReceipts} color="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300" />
                        <KPICard icon={AlertTriangle} label="Low Stock" value={kpis.lowStockCount} color="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300" />
                    </div>
                </div>
            )}

            {/* Recent Moves Box (Styled like "Top 10 Stores") */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 p-5 shadow-sm h-[400px] flex flex-col transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground dark:text-slate-200">Recent Stock Movements</h2>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        Updated {formatDateTime(lastUpdated)}
                    </span>
                </div>

                <div className="overflow-y-auto flex-1 pr-2">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <tr className="border-b border-border dark:border-slate-800">
                                {['Date', 'Type', 'Reference', 'Product', 'From', 'To', 'Change', 'After'].map(h => (
                                    <th key={h} className="pb-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-slate-800">
                            {moves.length === 0 ? (
                                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No stock movements yet</td></tr>
                            ) : moves.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground text-xs">{formatDateTime(m.createdAt).split(',')[0]}</td>
                                    <td className="py-3 pr-4"><StatusBadge status={m.type as any} /></td>
                                    <td className="py-3 pr-4 font-mono text-xs text-slate-800 dark:text-slate-300">{m.reference}</td>
                                    <td className="py-3 pr-4">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{m.product.name}</div>
                                    </td>
                                    <td className="py-3 pr-4 text-muted-foreground text-xs truncate max-w-[100px]">{m.fromLoc ? m.fromLoc.name : '—'}</td>
                                    <td className="py-3 pr-4 text-muted-foreground text-xs truncate max-w-[100px]">{m.toLoc ? m.toLoc.name : '—'}</td>
                                    <td className="py-3 pr-4 font-semibold">
                                        <span className={m.qtyChange > 0 ? 'text-emerald-500' : 'text-red-500'}>
                                            {m.qtyChange > 0 ? '+' : ''}{m.qtyChange}
                                        </span>
                                    </td>
                                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{m.qtyAfter}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
