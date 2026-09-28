import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import CourseEditor from "./pages/CourseEditor";
import NotFound from "./pages/NotFound";
import { LangProvider } from "@/i18n/lang";


// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">Cargando...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Admin-only route. The database enforces the same rule; this only keeps
// other roles from landing on a screen whose requests would all fail.
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAuth();

  if (userProfile?.role !== 'admin' || userProfile?.status !== 'active') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">Cargando...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const ThemedWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isPublic = location.pathname === '/' || location.pathname === '/auth';
  return (
    <div className={`${isPublic ? 'landing-theme force-light ' : ''}min-h-screen relative`}>
      {children}
    </div>
  );
};

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="deskcontrol-theme">
    <AuthProvider>
      <LangProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemedWrapper>
            <div className="relative z-10">
              <Routes>
                <Route path="/" element={
                  <PublicRoute>
                    <Index />
                  </PublicRoute>
                } />
                <Route path="/auth" element={
                  <PublicRoute>
                    <Auth />
                  </PublicRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                <Route path="/admin/courses/:courseId" element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <CourseEditor />
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </ThemedWrapper>
        </BrowserRouter>
      </TooltipProvider>
      </LangProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
