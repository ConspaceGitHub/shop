import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ProtectedMemberRoute from './components/ProtectedMemberRoute';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminStatsPage from './pages/admin/AdminStatsPage';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedMemberRoute>
                  <HomePage />
                </ProtectedMemberRoute>
              }
            />
            <Route
              path="/about"
              element={
                <ProtectedMemberRoute>
                  <AboutPage />
                </ProtectedMemberRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedMemberRoute>
                  <ProductDetailPage />
                </ProtectedMemberRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedMemberRoute>
                  <CartPage />
                </ProtectedMemberRoute>
              }
            />
            <Route
              path="/order-success"
              element={
                <ProtectedMemberRoute>
                  <OrderSuccessPage />
                </ProtectedMemberRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedMemberRoute>
                  <CheckoutPage />
                </ProtectedMemberRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedMemberRoute>
                  <MyOrdersPage />
                </ProtectedMemberRoute>
              }
            />

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
            <Route
              path="/admin/orders"
              element={
                <ProtectedAdminRoute>
                  <AdminOrdersPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedAdminRoute>
                  <AdminProductsPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <ProtectedAdminRoute>
                  <AdminCouponsPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/stats"
              element={
                <ProtectedAdminRoute>
                  <AdminStatsPage />
                </ProtectedAdminRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
