// App.tsx: the route table. Each module (Customers, Products,
// Challans) adds its list/detail routes here, nested inside
// AppLayout + ProtectedRoute the same way Dashboard already is.
//
// Customers gets its own nested ProtectedRoute with allowedRoles,
// since Warehouse has no access to that module at all. Products'
// list/detail routes need no extra role restriction -- every role has
// at least view access there -- but /products/new is Admin/Warehouse
// only, matching who's allowed to create products on the backend.
// See backend/README.md's "Design decisions / assumptions" for the
// reasoning behind each of these.

import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { CustomersList } from "./pages/customers/CustomersList";
import { CustomerForm } from "./pages/customers/CustomerForm";
import { CustomerDetail } from "./pages/customers/CustomerDetail";
import { ProductsList } from "./pages/products/ProductsList";
import { ProductForm } from "./pages/products/ProductForm";
import { ProductDetail } from "./pages/products/ProductDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SALES", "ACCOUNTS"]} />}>
            <Route path="/customers" element={<CustomersList />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SALES"]} />}>
            <Route path="/customers/new" element={<CustomerForm />} />
          </Route>

          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "WAREHOUSE"]} />}>
            <Route path="/products/new" element={<ProductForm />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
