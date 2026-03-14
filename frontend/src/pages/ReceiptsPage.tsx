import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { toast } from 'sonner'
import { Plus, Search, CheckCircle, XCircle, FileDown, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Product { id: string; name: string; sku: string }
interface Location { id: string; name: string; code: string; warehouse: { name: string } }
interface Receipt { id: string; reference: string; supplier: string; status: string; createdAt: string; user: { name: string }; lines: any[] }

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState<{ id: string; action: 'validate' | 'cancel' } | null>(null)
    const [form, setForm] = useState({ supplier: '', notes: '', lines: [{ productId: '', qty: 1, locationId: '' }] })

    const fetchReceipts = useCallback(async () => {
        const params: any = {}
        if (search) params.search = search
        if (filterStatus) params.status = filterStatus
        const { data } = await api.get('/receipts', { params })
        setReceipts(data.data); setLoading(false)
    }, [search, filterStatus])

    useEffect(() => {
        api.get('/products', { params: { limit: 200 } }).then(r => setProducts(r.data.data))
        api.get('/warehouses').then(r => {
            const locs: Location[] = []
            r.data.forEach((wh: any) => wh.locations.forEach((l: any) => locs.push({ ...l, warehouse: { name: wh.name } })))
            setLocations(locs)
        })
    }, [])
    useEffect(() => { fetchReceipts() }, [fetchReceipts])

    const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { productId: '', qty: 1, locationId: '' }] }))
    const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))
    const updateLine = (i: number, field: string, val: any) =>
        setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }))

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            await api.post('/receipts', form)
            toast.success('Receipt created'); setShowCreate(false)
            setForm({ supplier: '', notes: '', lines: [{ productId: '', qty: 1, locationId: '' }] })
            fetchReceipts()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') } finally { setSaving(false) }
    }

    const handleAction = async () => {
        if (!confirm) return; setSaving(true)
        try {
            await api.post(`/receipts/${confirm.id}/${confirm.action}`)
            toast.success(confirm.action === 'validate' ? 'Receipt validated! Stock updated.' : 'Receipt canceled.')
            setConfirm(null); fetchReceipts()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') } finally { setSaving(false) }
    }

    const statusOptions = ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']

    const downloadPDF = (r: Receipt) => {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(22)
        doc.setTextColor(79, 70, 229) // Primary color
        doc.text('CoreInventory', 14, 22)

        doc.setFontSize(14)
        doc.setTextColor(15, 23, 42) // Foreground
        doc.text('RECEIPT VOUCHER', 14, 32)

        // Metadata
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139) // Muted
        doc.text(`Reference: ${r.reference}`, 14, 45)
        doc.text(`Supplier: ${r.supplier}`, 14, 51)
        doc.text(`Date: ${formatDate(r.createdAt)}`, 14, 57)
        doc.text(`Status: ${r.status}`, 14, 63)
        doc.text(`Created By: ${r.user.name}`, 14, 69)

        // Table Data
        const tableData = r.lines.map(l => [
            l.product.sku,
            l.product.name,
            l.qty.toString() + ' ' + (l.product.unit || 'pcs')
        ])

        autoTable(doc, {
            startY: 80,
            head: [['SKU', 'Product', 'Quantity Received']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
        })

        // Clean the reference string to ensure it's a valid filename and ALWAYS append .pdf
        const safeRef = r.reference.replace(/[^a-zA-Z0-9-]/g, '_')
        doc.save(`Receipt_${safeRef}.pdf`)

        toast.success('PDF Downloaded!')
    }

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-foreground">Receipts</h1><p className="text-muted-foreground text-sm">Incoming stock from suppliers</p></div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" /> New Receipt
                </button>
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reference or supplier…"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">All Status</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                {['Reference', 'Supplier', 'Lines', 'Status', 'Created', 'Created By', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? [...Array(4)].map((_, i) => (
                                <tr key={i}><td colSpan={7}><div className="h-4 mx-4 my-3 bg-secondary/50 rounded animate-pulse" /></td></tr>
                            )) : receipts.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No receipts found</td></tr>
                            ) : receipts.map(r => (
                                <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-primary">{r.reference}</td>
                                    <td className="px-4 py-3 font-medium text-foreground">{r.supplier}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{r.lines.length} item{r.lines.length !== 1 ? 's' : ''}</td>
                                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{r.user.name}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {!['DONE', 'CANCELED'].includes(r.status) && (
                                                <button onClick={() => setConfirm({ id: r.id, action: 'validate' })}
                                                    className="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors" title="Validate">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {!['DONE', 'CANCELED'].includes(r.status) && (
                                                <button onClick={() => setConfirm({ id: r.id, action: 'cancel' })}
                                                    className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Cancel">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => downloadPDF(r)}
                                                className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Download PDF">
                                                <FileDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-semibold">New Receipt</h3>
                            <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier *</label>
                                    <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} required
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-medium text-muted-foreground">Product Lines *</label>
                                    <button type="button" onClick={addLine} className="text-xs text-primary hover:underline">+ Add line</button>
                                </div>
                                <div className="space-y-2">
                                    {form.lines.map((line, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_80px_1fr_30px] gap-2 items-center">
                                            <select value={line.productId} onChange={e => updateLine(i, 'productId', e.target.value)} required
                                                className="px-2 py-1.5 rounded-lg bg-input border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                                <option value="">Product…</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                            </select>
                                            <input type="number" value={line.qty} onChange={e => updateLine(i, 'qty', parseInt(e.target.value))} min={1} required
                                                className="px-2 py-1.5 rounded-lg bg-input border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                            <select value={line.locationId} onChange={e => updateLine(i, 'locationId', e.target.value)} required
                                                className="px-2 py-1.5 rounded-lg bg-input border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                                <option value="">Location…</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} › {l.name}</option>)}
                                            </select>
                                            <button type="button" onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Create Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction} loading={saving}
                title={confirm?.action === 'validate' ? 'Validate Receipt' : 'Cancel Receipt'}
                description={confirm?.action === 'validate'
                    ? 'This will mark the receipt as Done and automatically increase stock levels for all product lines.'
                    : 'This will cancel the receipt. Stock levels will not be affected.'}
                confirmLabel={confirm?.action === 'validate' ? 'Validate & Update Stock' : 'Cancel Receipt'}
                confirmVariant={confirm?.action === 'validate' ? 'primary' : 'danger'}
            />
        </div>
    )
}
