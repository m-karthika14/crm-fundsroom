import type { Role } from "../../types";

export interface NavItem {
  label: string;
  path: string;
  // Roles allowed to see this nav item. Mirrors the access rules each
  // module's routes actually enforce -- see backend/README.md's
  // "Design decisions / assumptions" for why Customers excludes
  // Warehouse specifically.
  roles: Role[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
  { label: "Customers", path: "/customers", roles: ["ADMIN", "SALES", "ACCOUNTS"] },
  { label: "Products", path: "/products", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
  { label: "Challans", path: "/challans", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
];
