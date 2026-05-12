import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

export default function ProtectedLayout() {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-sentinel-bg">
        <div className="font-mono text-sentinel-blue text-sm animate-pulse">$ verifying session...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen flex bg-sentinel-bg">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
