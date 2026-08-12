// Dashboard: quick stats per the plan -- low stock alerts, pending
// follow-ups, draft challans. Each card previews a few items and
// links through to the filtered list view for the rest.
//
// Pending follow-ups has no dedicated backend filter (the plan's
// GET /customers doesn't take a "due date" query param), so this
// fetches a page of customers and filters client-side for a follow-up
// date that's today or earlier. Fine at this data scale; would move
// to a backend filter if the customer list grew large.

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { PageSpinner, ErrorBanner } from "../components/ui/Feedback";
import { listProducts } from "../api/products";
import { listChallans } from "../api/challans";
import { listCustomers } from "../api/customers";
import { getErrorMessage } from "../api/client";
import { formatDate, isDueOrOverdue } from "../lib/format";
import type { Challan, Customer, Product } from "../types";

interface DashboardData {
  lowStockProducts: Product[];
  lowStockTotal: number;
  draftChallans: Challan[];
  draftTotal: number;
  pendingFollowUps: Customer[];
}

export function Dashboard() {
  const { user } = useAuth();
  const canSeeCustomers = user?.role !== "WAREHOUSE";

  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [lowStock, drafts, customerPage] = await Promise.all([
          listProducts({ lowStock: true, limit: 5 }),
          listChallans({ status: "DRAFT", limit: 5 }),
          canSeeCustomers ? listCustomers({ limit: 100 }) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const pendingFollowUps = (customerPage?.data ?? [])
          .filter((c) => isDueOrOverdue(c.followUpDate))
          .slice(0, 5);

        setData({
          lowStockProducts: lowStock.data,
          lowStockTotal: lowStock.total,
          draftChallans: drafts.data,
          draftTotal: drafts.total,
          pendingFollowUps,
        });
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [canSeeCustomers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0]}`}
        description="Here's what's happening across the business."
      />

      {error && <ErrorBanner message={error} />}
      {!data && !error && <PageSpinner />}

      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Low Stock Alerts" count={data.lowStockTotal} tone="amber" to="/products?lowStock=true">
            {data.lowStockProducts.length === 0 && <p className="text-sm text-ink-faint">All stocked up.</p>}
            {data.lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink-soft">{p.name}</span>
                <span className="font-tabular shrink-0 text-amber-600">
                  {p.currentStock} / {p.minStockAlert}
                </span>
              </div>
            ))}
          </StatCard>

          {canSeeCustomers && (
            <StatCard label="Pending Follow-ups" count={data.pendingFollowUps.length} tone="forest" to="/customers">
              {data.pendingFollowUps.length === 0 && <p className="text-sm text-ink-faint">Nothing due.</p>}
              {data.pendingFollowUps.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-ink-soft">{c.name}</span>
                  <span className="font-tabular shrink-0 text-ink-faint">{formatDate(c.followUpDate)}</span>
                </div>
              ))}
            </StatCard>
          )}

          <StatCard label="Draft Challans" count={data.draftTotal} tone="rust" to="/challans?status=DRAFT">
            {data.draftChallans.length === 0 && <p className="text-sm text-ink-faint">No open drafts.</p>}
            {data.draftChallans.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-tabular text-ink-soft">{c.challanNumber}</span>
                <span className="truncate text-ink-faint">{c.customer.name}</span>
              </div>
            ))}
          </StatCard>
        </div>
      )}
    </div>
  );
}
