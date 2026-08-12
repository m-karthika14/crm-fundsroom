// Placeholder for now -- the real dashboard (low-stock alerts, pending
// follow-ups, draft challans) is the next thing to build.

import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/ui/PageHeader";

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0]}`}
        description="Here's what's happening across the business."
      />
    </div>
  );
}
