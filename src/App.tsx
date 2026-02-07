import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";

import Index from "./pages/Index";
import DealDetail from "./pages/DealDetail";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import MerchantRegister from "./pages/auth/MerchantRegister";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Vouchers from "./pages/consumer/Vouchers";
import Profile from "./pages/consumer/Profile";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import HelpCenter from "./pages/help/HelpCenter";
import HelpCategory from "./pages/help/HelpCategory";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import DealForm from "./pages/merchant/DealForm";
import AdForm from "./pages/merchant/AdForm";
import MerchantProfile from "./pages/merchant/MerchantProfile";
import MerchantDealDetail from "./pages/merchant/MerchantDealDetail";
import DealAnalytics from "./pages/merchant/DealAnalytics";
import MerchantPublicProfile from "./pages/merchant/MerchantPublicProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDealDetail from "./pages/admin/AdminDealDetail";
import AdminMerchantDetail from "./pages/admin/AdminMerchantDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/deal/:id" element={<DealDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registreren" element={<Register />} />
              <Route path="/merchant/registreren" element={<MerchantRegister />} />
              <Route path="/wachtwoord-vergeten" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/profiel" element={<Profile />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/algemene-voorwaarden" element={<Terms />} />
              <Route path="/privacybeleid" element={<Privacy />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/help/:categorySlug" element={<HelpCategory />} />
              <Route path="/merchant" element={<MerchantDashboard />} />
              <Route path="/merchant/deal/:id" element={<DealForm />} />
              <Route path="/merchant/ads/new" element={<AdForm />} />
              <Route path="/merchant/deals/:dealId" element={<MerchantDealDetail />} />
              <Route path="/merchant/deals/:dealId/analytics" element={<DealAnalytics />} />
              <Route path="/merchant/ads/:id/edit" element={<AdForm />} />
              <Route path="/merchant/profiel" element={<MerchantProfile />} />
              <Route path="/bedrijf/:merchantId" element={<MerchantPublicProfile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/deals/:dealId" element={<AdminDealDetail />} />
              <Route path="/admin/ondernemers/:merchantId" element={<AdminMerchantDetail />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
