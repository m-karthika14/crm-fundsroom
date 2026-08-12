// App.tsx: the route table. Each future module (Customers, Products,
// Challans) adds its list/detail routes here, nested inside
// AppLayout + ProtectedRoute the same way Dashboard already is.

import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Route>
    </Routes>
  );
}
