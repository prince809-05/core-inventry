import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Product { id: string; name: string; sku: string }
interface Location { id: string; name: string; warehouse: { name: string } }
interface Adjustment { id: string; reference: string; physicalQty: number; previousQty: number; difference: number; reason: string; createdAt: string; product: { name: string; sku: string }; location: { name: string; warehouse: { name: string } }; user: { name: string } }

export default function AdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<Adjustment[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ productId: '', locationId: '', physicalQty: 0, reason: '' })

    const fetchAdjustments = useCallback(async () => {
        const { data } = await api.get('/adjustments')
        setAdjustments(data.data); setLoading(false)
    }, [])

    useEffect(() => {
        api.get('/products', { params: { limit: 200 } }).then(r => setProducts(r.data.data))
        api.get('/warehouses').then(r => {
            const locs: Location[] = []
            r.data.forEach((wh: any) => wh.locations.forEach((l: any) => locs.push({ ...l, warehouse: { name: wh.name } })))
            setLocations(locs)
        })
        fetchAdjustments()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            await api.post('/adjustments', form)
            toast.success('Adjustment applied'); setShowCreate(false)
            setForm({ productId: '', locationId: '', physicalQty: 0, reason: '' })
            fetchAdjustments()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') } finally { setSaving(false) }
    }

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-foreground">Stock Adjustments</h1><p className="text-muted-foreground text-sm">Physical count corrections</p></div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" /> New Adjustment
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                {['Reference', 'Product', 'Location', 'Previous', 'Physical', 'Difference', 'Reason', 'Date', 'By'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={9}><div className="h-4 mx-4 my-3 bg-secondary/50 rounded animate-pulse" /></td></tr>)
                                : adjustments.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No adjustments yet</td></tr>
                                    : adjustments.map(a => (
                                        <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-primary">{a.reference}</td>
                                            <td className="px-4 py-3"><div className="font-medium text-foreground text-xs">{a.product.name}</div><div className="text-xs text-muted-foreground">{a.product.sku}</div></td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{a.location.warehouse.name} › {a.location.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{a.previousQty}</td>
                                            <td className="px-4 py-3 text-foreground font-medium">{a.physicalQty}</td>
                                            <td className="px-4 py-3 font-semibold">
                                                <span className={a.difference > 0 ? 'text-emerald-400' : a.difference < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                                                    {a.difference > 0 ? '+' : ''}{a.difference}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{a.reason}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{a.user.name}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-semibold">New Adjustment</h3>
                            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Product *</label>
                                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} required
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="">Select product…</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                </select></div>
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Location *</label>
                                <select value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} required
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="">Select location…</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} › {l.name}</option>)}
                                </select></div>
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Physical Count *</label>
                                <input type="number" value={form.physicalQty} onChange={e => setForm(f => ({ ...f, physicalQty: parseInt(e.target.value) || 0 }))} min={0} required
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Reason *</label>
                                <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="">Select reason…</option>
                                    {['Damaged', 'Lost', 'Found', 'Count Correction', 'Theft', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select></div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? 'Applying...' : 'Apply Adjustment'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
