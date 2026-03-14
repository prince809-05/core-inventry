import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { Toaster } from 'sonner'

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <TopHeader />
                <main className="flex-1 overflow-y-auto w-full">
                    {children}
                </main>
            </div>

            <Toaster richColors position="top-right" />
        </div>
    )
}
