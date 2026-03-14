import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { StatusBadge, StockBadge } from '@/components/StatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'

interface Category { id: string; name: string }
interface Location { id: string; name: string; code: string; warehouse: { name: string } }
interface StockLevel { qty: number; location: Location }
interface Product {
    id: string; name: string; sku: string; unit: string; reorderQty: number; description?: string
    category: Category; stockLevels: StockLevel[]; totalStock: number; isLowStock: boolean; isOutOfStock: boolean
}

const initForm = { name: '', sku: '', categoryId: '', unit: 'pcs', reorderQty: 10, description: '' }

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [modal, setModal] = useState<'none' | 'create' | 'edit'>('none')
    const [editProduct, setEditProduct] = useState<Product | null>(null)
    const [form, setForm] = useState(initForm)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchProducts = useCallback(async () => {
        const params: any = {}
        if (search) params.search = search
        if (filterCategory) params.categoryId = filterCategory
        const { data } = await api.get('/products', { params })
        setProducts(data.data)
        setLoading(false)
    }, [search, filterCategory])

    useEffect(() => {
        api.get('/categories').then(r => setCategories(r.data))
        api.get('/warehouses').then(r => {
            const locs: Location[] = []
            r.data.forEach((wh: any) => wh.locations.forEach((l: any) => locs.push({ ...l, warehouse: { name: wh.name } })))
            setLocations(locs)
        })
    }, [])

    useEffect(() => { fetchProducts() }, [fetchProducts])

    const openCreate = () => { setForm(initForm); setEditProduct(null); setModal('create') }
    const openEdit = (p: Product) => {
        setForm({ name: p.name, sku: p.sku, categoryId: p.category.id, unit: p.unit, reorderQty: p.reorderQty, description: p.description || '' })
        setEditProduct(p); setModal('edit')
    }
    const closeModal = () => { setModal('none'); setEditProduct(null) }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (modal === 'create') {
                await api.post('/products', form)
                toast.success('Product created')
            } else {
                await api.put(`/products/${editProduct!.id}`, form)
                toast.success('Product updated')
            }
            closeModal(); fetchProducts()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to save product') }
        finally { setSaving(false) }
    }

    const handleDelete = async () => {
        if (!deleteId) return; setSaving(true)
        try {
            await api.delete(`/products/${deleteId}`)
            toast.success('Product deleted'); setDeleteId(null); fetchProducts()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to delete') }
        finally { setSaving(false) }
    }

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-foreground">Products</h1><p className="text-muted-foreground text-sm">Manage your product catalog</p></div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" /> New Product
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                {['Product', 'SKU', 'Category', 'Unit', 'Reorder Qty', 'Stock', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td></tr>
                                ))
                            ) : products.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No products found</td></tr>
                            ) : products.map((p) => (
                                <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-foreground">{p.name}</div>
                                        {p.description && <div className="text-xs text-muted-foreground truncate max-w-48">{p.description}</div>}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-primary">{p.sku}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.reorderQty}</td>
                                    <td className="px-4 py-3 font-semibold text-foreground">{p.totalStock}</td>
                                    <td className="px-4 py-3"><StockBadge total={p.totalStock} reorderQty={p.reorderQty} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modal !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-semibold">{modal === 'create' ? 'New Product' : 'Edit Product'}</h3>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                                <div><label className="block text-xs font-medium text-muted-foreground mb-1">SKU *</label>
                                    <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Category *</label>
                                    <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} required
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        <option value="">Select…</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select></div>
                                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
                                    <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Reorder Qty</label>
                                    <input type="number" value={form.reorderQty} onChange={e => setForm(f => ({ ...f, reorderQty: parseInt(e.target.value) }))} min={0}
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                            </div>
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
                title="Delete Product" description="This product will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete" confirmVariant="danger" loading={saving}
            />
        </div>
    )
}
