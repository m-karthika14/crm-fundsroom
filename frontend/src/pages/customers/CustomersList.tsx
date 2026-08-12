// CustomersList: search + filter + paginated table. Filter state lives
// in the URL (?q=&status=&type=&page=) so a filtered view is shareable
// and survives a refresh -- also how the Dashboard's stat cards can
// deep-link into a pre-filtered list.

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listCustomers } from "../../api/customers";
import { getErrorMessage } from "../../api/client";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { formatDate } from "../../lib/format";
import type { Customer, CustomerStatus, CustomerType } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Table, THead, TH, TR, TD } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { PageSpinner, ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { CustomerStatusBadge } from "../../components/ui/Badge";

const CAN_MANAGE = ["ADMIN", "SALES"];

export function CustomersList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") as CustomerStatus | null) ?? "";
  const type = (searchParams.get("type") as CustomerType | null) ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [qInput, setQInput] = useState(q);
  const debouncedQ = useDebouncedValue(qInput);

  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Push the debounced search text into the URL (and reset to page 1).
  useEffect(() => {
    if (debouncedQ === q) return;
    updateParams({ q: debouncedQ || undefined, page: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    listCustomers({ q: q || undefined, status: status || undefined, type: type || undefined, page, limit: 15 })
      .then((res) => {
        if (cancelled) return;
        setCustomers(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));

    return () => {
      cancelled = true;
    };
  }, [q, status, type, page]);

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Your CRM pipeline -- leads, accounts, and everything in between."
        actions={
          user && CAN_MANAGE.includes(user.role) ? (
            <Button onClick={() => navigate("/customers/new")}>+ New Customer</Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search name, mobile, business..."
          className="h-10 w-64 rounded-md border border-border bg-paper-raised px-3 text-sm placeholder:text-ink-faint focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
        />
        <Select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
        <Select
          value={type}
          onChange={(e) => updateParams({ type: e.target.value || undefined, page: undefined })}
          className="w-44"
        >
          <option value="">All types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {!customers && !error && <PageSpinner />}

      {customers && customers.length === 0 && (
        <EmptyState title="No customers found" hint="Try adjusting your search or filters." />
      )}

      {customers && customers.length > 0 && (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Mobile</TH>
                <TH>Business</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH>Follow-up</TH>
              </TR>
            </THead>
            <tbody>
              {customers.map((c) => (
                <TR key={c.id} className="cursor-pointer hover:bg-ink/[0.02]">
                  <TD>
                    <Link to={`/customers/${c.id}`} className="font-medium text-ink hover:text-forest-600">
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="font-tabular">{c.mobile}</TD>
                  <TD className="text-ink-soft">{c.businessName || "—"}</TD>
                  <TD className="text-ink-soft">{c.type}</TD>
                  <TD>
                    <CustomerStatusBadge status={c.status} />
                  </TD>
                  <TD className="font-tabular text-ink-soft">{formatDate(c.followUpDate)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
