import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import ReceiptsPage from '@/pages/ReceiptsPage'
import DeliveriesPage from '@/pages/DeliveriesPage'
import TransfersPage from '@/pages/TransfersPage'
import AdjustmentsPage from '@/pages/AdjustmentsPage'
import StockMovesPage from '@/pages/StockMovesPage'
import WarehousesPage from '@/pages/WarehousesPage'
import ProfilePage from '@/pages/ProfilePage'
import { Toaster } from 'sonner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><DashboardPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/receipts" element={
          <ProtectedRoute><AppLayout><ReceiptsPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/deliveries" element={
          <ProtectedRoute><AppLayout><DeliveriesPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/transfers" element={
          <ProtectedRoute><AppLayout><TransfersPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/adjustments" element={
          <ProtectedRoute><AppLayout><AdjustmentsPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/stock-moves" element={
          <ProtectedRoute><AppLayout><StockMovesPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/warehouses" element={
          <ProtectedRoute><AppLayout><WarehousesPage /></AppLayout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
