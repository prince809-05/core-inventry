import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

interface Location { id: string; name: string; code: string }
interface Warehouse { id: string; name: string; code: string; address?: string; locations: Location[] }

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState<'warehouse' | 'location' | null>(null)
    const [editWH, setEditWH] = useState<Warehouse | null>(null)
    const [selectedWH, setSelectedWH] = useState<string>('')
    const [saving, setSaving] = useState(false)
    const [whForm, setWhForm] = useState({ name: '', code: '', address: '' })
    const [locForm, setLocForm] = useState({ name: '', code: '' })

    const fetchWarehouses = useCallback(async () => {
        const { data } = await api.get('/warehouses')
        setWarehouses(data); setLoading(false)
    }, [])

    useEffect(() => { fetchWarehouses() }, [fetchWarehouses])

    const openCreateWH = () => { setWhForm({ name: '', code: '', address: '' }); setEditWH(null); setModal('warehouse') }
    const openEditWH = (wh: Warehouse) => { setWhForm({ name: wh.name, code: wh.code, address: wh.address || '' }); setEditWH(wh); setModal('warehouse') }
    const openAddLoc = (whId: string) => { setSelectedWH(whId); setLocForm({ name: '', code: '' }); setModal('location') }

    const saveWarehouse = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editWH) { await api.put(`/warehouses/${editWH.id}`, whForm); toast.success('Warehouse updated') }
            else { await api.post('/warehouses', whForm); toast.success('Warehouse created') }
            setModal(null); fetchWarehouses()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') } finally { setSaving(false) }
    }

    const deleteWarehouse = async (id: string) => {
        if (!confirm('Delete this warehouse? All sub-locations will also be removed.')) return
        try { await api.delete(`/warehouses/${id}`); toast.success('Warehouse deleted'); fetchWarehouses() }
        catch (err: any) { toast.error(err.response?.data?.error || 'Failed') }
    }

    const saveLocation = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            await api.post('/locations', { warehouseId: selectedWH, ...locForm })
            toast.success('Location added'); setModal(null); fetchWarehouses()
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') } finally { setSaving(false) }
    }

    const deleteLocation = async (id: string) => {
        if (!confirm('Delete this location?')) return
        try { await api.delete(`/locations/${id}`); toast.success('Location deleted'); fetchWarehouses() }
        catch (err: any) { toast.error(err.response?.data?.error || 'Failed') }
    }

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-foreground">Warehouses</h1><p className="text-muted-foreground text-sm">Manage storage locations</p></div>
                <button onClick={openCreateWH} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" /> New Warehouse
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-card rounded-xl animate-pulse border border-border" />)}</div>
            ) : warehouses.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">No warehouses yet</div>
            ) : (
                <div className="space-y-4">
                    {warehouses.map(wh => (
                        <div key={wh.id} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/20">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-foreground">{wh.name}</span>
                                        <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{wh.code}</span>
                                    </div>
                                    {wh.address && <div className="text-xs text-muted-foreground mt-0.5">{wh.address}</div>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openAddLoc(wh.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
                                        <Plus className="w-3 h-3" /> Add Location
                                    </button>
                                    <button onClick={() => openEditWH(wh)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => deleteWarehouse(wh.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            {wh.locations.length === 0 ? (
                                <div className="px-6 py-4 text-sm text-muted-foreground">No locations yet. Add one above.</div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 p-4">
                                    {wh.locations.map(loc => (
                                        <div key={loc.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 border border-border">
                                            <div><div className="text-sm font-medium text-foreground">{loc.name}</div><div className="font-mono text-xs text-muted-foreground">{loc.code}</div></div>
                                            <button onClick={() => deleteLocation(loc.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Warehouse Modal */}
            {modal === 'warehouse' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-semibold">{editWH ? 'Edit Warehouse' : 'New Warehouse'}</h3>
                            <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <form onSubmit={saveWarehouse} className="p-6 space-y-4">
                            {[{ label: 'Name', field: 'name', ph: 'Main Warehouse' }, { label: 'Code', field: 'code', ph: 'WH-MAIN' }, { label: 'Address', field: 'address', ph: '123 Industrial Ave' }].map(({ label, field, ph }) => (
                                <div key={field}><label className="block text-xs font-medium text-muted-foreground mb-1">{label}{field !== 'address' ? ' *' : ''}</label>
                                    <input value={(whForm as any)[field]} onChange={e => setWhForm(f => ({ ...f, [field]: e.target.value }))} required={field !== 'address'} placeholder={ph}
                                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                            ))}
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Location Modal */}
            {modal === 'location' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-semibold">Add Location</h3>
                            <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <form onSubmit={saveLocation} className="p-6 space-y-4">
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
                                <input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} required placeholder="Rack A"
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Code *</label>
                                <input value={locForm.code} onChange={e => setLocForm(f => ({ ...f, code: e.target.value }))} required placeholder="RACK-A"
                                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? 'Adding...' : 'Add Location'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
