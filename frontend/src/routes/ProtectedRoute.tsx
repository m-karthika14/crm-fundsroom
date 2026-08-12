// ProtectedRoute: wraps a page and makes sure a user is logged in
// (and, optionally, has an allowed role) before rendering it.
// Usage: <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Avoid a flash-redirect to /login while we're still checking
    // localStorage for a saved session.
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
