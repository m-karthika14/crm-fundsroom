import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-4 border-b border-border bg-paper-raised px-8">
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-ink leading-tight">{user.name}</p>
            <p className="text-xs text-ink-faint leading-tight">{user.email}</p>
          </div>
          <RoleBadge role={user.role} />
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      )}
    </header>
  );
}
