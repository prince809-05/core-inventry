import { useAuthStore } from '@/store/authStore'
import { Search, Bell, Moon, Sun, Box, X } from 'lucide-react'
import { useState, useEffect } from 'react'

export function TopHeader() {
    const { user } = useAuthStore()
    const [isDark, setIsDark] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)

    // Load theme preference on mount
    useEffect(() => {
        const _isDark = localStorage.getItem('theme') === 'dark' ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)

        if (_isDark) {
            document.documentElement.classList.add('dark')
            setIsDark(true)
        } else {
            document.documentElement.classList.remove('dark')
            setIsDark(false)
        }
    }, [])

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
            setIsDark(false)
        } else {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
            setIsDark(true)
        }
    }

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-border flex items-center justify-between px-6 shrink-0 z-10 transition-colors">
            {/* Logo area */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-primary/20 border border-border">
                    <Box className="w-5 h-5 text-slate-800 dark:text-primary" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground tracking-wide leading-none">CoreInventory</span>
                    <span className="text-xs font-medium text-muted-foreground mt-1 leading-none">
                        Welcome {user?.name?.split(' ')[0] || 'Admin'} !
                    </span>
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-1.5 w-64 bg-slate-50 dark:bg-slate-800 border border-border rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-primary dark:text-white transition-colors"
                    />
                </div>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-200 relative">
                    <button
                        onClick={toggleTheme}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative ${showNotifications ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                    >
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                            <div className="absolute top-12 right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-border dark:border-slate-700 overflow-hidden z-50">
                                <div className="p-4 border-b border-border dark:border-slate-700 flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">3 New</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {[
                                        { title: 'Low Stock Alert', desc: 'Product SKU-123 is below minimum threshold.', time: '2 mins ago', unread: true },
                                        { title: 'New Order', desc: 'Order #ORD-882 has been placed.', time: '1 hr ago', unread: true },
                                        { title: 'System Update', desc: 'Maintenance scheduled for tonight at 2 AM.', time: '5 hrs ago', unread: true },
                                        { title: 'Transfer Complete', desc: 'Transfer #TRX-991 has been verified.', time: '1 day ago', unread: false }
                                    ].map((notify, i) => (
                                        <div key={i} className={`p-4 border-b border-border dark:border-slate-700 hover:bg-muted/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex gap-3 ${notify.unread ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${notify.unread ? 'bg-primary' : 'bg-transparent'}`} />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{notify.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{notify.desc}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{notify.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-border dark:border-slate-700 bg-muted/20 dark:bg-slate-800 text-center">
                                    <button onClick={() => setShowNotifications(false)} className="text-xs text-primary font-medium hover:underline p-1">Mark all as read</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
