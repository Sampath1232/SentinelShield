import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import ProtectedLayout from "@/components/ProtectedLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Logs from "@/pages/Logs";
import Simulator from "@/pages/Simulator";
import Rules from "@/pages/Rules";
import IpReputation from "@/pages/IpReputation";
import Upload from "@/pages/Upload";

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/ip-reputation" element={<IpReputation />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <Toaster theme="dark" position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
