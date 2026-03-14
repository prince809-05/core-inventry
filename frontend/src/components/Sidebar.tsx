import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
    LayoutDashboard, Package, ClipboardList, Truck, ArrowLeftRight,
    SlidersHorizontal, History, Warehouse, User, LogOut, ChevronLeft, ChevronRight, Box
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/receipts', icon: ClipboardList, label: 'Receipts' },
    { to: '/deliveries', icon: Truck, label: 'Deliveries' },
    { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
    { to: '/adjustments', icon: SlidersHorizontal, label: 'Adjustments' },
    { to: '/stock-moves', icon: History, label: 'Stock Ledger' },
    { to: '/warehouses', icon: Warehouse, label: 'Warehouses' },
]

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const handleLogout = () => { logout(); navigate('/login') }

    return (
        <aside className={cn(
            'flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-border text-slate-700 dark:text-slate-200 transition-all duration-300 shrink-0 relative',
            collapsed ? 'w-16' : 'w-60'
        )}>
            {/* Collapse Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-6 bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-300 p-1 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-20"
            >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* User Profile (Top) */}
            <NavLink
                to="/profile"
                className={({ isActive }) => cn(
                    "flex flex-col items-center justify-center p-6 border-b border-border shrink-0 min-h-[140px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    isActive ? "bg-slate-50 dark:bg-slate-800" : ""
                )}
            >
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 border border-border">
                    <User className="w-8 h-8 text-primary" />
                </div>
                {!collapsed && (
                    <div className="text-center w-full">
                        <div className="truncate text-sm text-foreground font-semibold">{user?.name}</div>
                        <div className="truncate text-xs text-muted-foreground mt-1">{user?.email}</div>
                    </div>
                )}
            </NavLink>

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                            isActive
                                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                        )}
                    >
                        <Icon className="w-5 h-5 shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-border">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-sm font-medium transition-all duration-150 text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    )
}
