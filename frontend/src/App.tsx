import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import AccessGate from "@/components/AccessGate";
import AdminLayout from "@/components/admin/AdminLayout";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import About from "@/pages/About";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import OrderDetail from "@/pages/OrderDetail";
import OrderInvoicePage from "@/pages/OrderInvoice";
import Orders from "@/pages/Orders";
import Profile from "@/pages/Profile";
import ProductDetail from "@/pages/ProductDetail";
import Products from "@/pages/Products";
import Register from "@/pages/Register";
import AdminAccounts from "@/pages/admin/AdminAccounts";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminImports from "@/pages/admin/AdminImports";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminReports from "@/pages/admin/AdminReports";
import AdminReturns from "@/pages/admin/AdminReturns";
import AdminSpaces from "@/pages/admin/AdminSpaces";

const queryClient = new QueryClient();

const AppShell = () => {
  const location = useLocation();
  const isAdminSection = location.pathname.startsWith("/quan-tri");

  return (
    <div className={isAdminSection ? "min-h-screen" : "flex min-h-screen flex-col"}>
      {!isAdminSection && (
        <header>
          <Navbar />
        </header>
      )}

      <main className={isAdminSection ? "min-h-screen" : "flex-1 pt-[5.8rem] md:pt-[6rem]"}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/san-pham" element={<Products />} />
          <Route path="/san-pham/:slug" element={<ProductDetail />} />
          <Route path="/gio-hang" element={<Cart />} />
          <Route path="/thanh-toan" element={<Checkout />} />
          <Route path="/gioi-thieu" element={<About />} />
          <Route path="/dang-nhap" element={<Login />} />
          <Route path="/dang-ky" element={<Register />} />
          <Route
            path="/don-hang"
            element={
              <AccessGate>
                <Orders />
              </AccessGate>
            }
          />
          <Route
            path="/don-hang/:orderId"
            element={
              <AccessGate>
                <OrderDetail />
              </AccessGate>
            }
          />
          <Route
            path="/don-hang/:orderId/hoa-don"
            element={
              <AccessGate>
                <OrderInvoicePage />
              </AccessGate>
            }
          />
          <Route
            path="/tai-khoan"
            element={
              <AccessGate>
                <Profile />
              </AccessGate>
            }
          />
          <Route element={<AccessGate allowedRoles={["admin", "nhan_vien"]} />}>
            <Route path="/quan-tri" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="don-hang" element={<AdminOrders />} />
              <Route path="tra-hang" element={<AdminReturns />} />
              <Route path="san-pham" element={<AdminProducts />} />
              <Route path="danh-muc" element={<AdminSpaces />} />
              <Route path="nhap-hang" element={<AdminImports />} />
              <Route path="bao-cao" element={<AdminReports />} />
              <Route element={<AccessGate allowedRoles={["admin"]} />}>
                <Route path="tai-khoan" element={<AdminAccounts />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isAdminSection && (
        <footer>
          <Footer />
        </footer>
      )}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
