import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2 } from "lucide-react";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Home";
import Rankings from "@/pages/Rankings";
import Courses from "@/pages/Courses";
import Library from "@/pages/Library";
import Settings from "@/pages/Settings";
import ChangePassword from "@/pages/ChangePassword";
import AdminUsers from "@/pages/AdminUsers";
import SetupAdmin from "@/pages/SetupAdmin";
import NotFound from "@/pages/NotFound";
import CoursePlayer from "@/pages/CoursePlayer";
import MyList from "@/pages/MyList";
import RankingConfig from "@/pages/Admin/RankingConfig";
import AdminAnalytics from "@/pages/AdminAnalytics";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            
            {/* Player Route (Outside MainLayout) */}
            <Route path="/player/:courseId" element={
              <ProtectedRoute>
                <CoursePlayer />
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/home" element={<Dashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/library" element={<Library />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/my-list" element={<MyList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/ranking-config" element={<RankingConfig />} />
              <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
