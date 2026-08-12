import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listChallans } from "../../api/challans";
import { getErrorMessage } from "../../api/client";
import { formatDate } from "../../lib/format";
import type { Challan, ChallanStatus } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Table, THead, TH, TR, TD } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { PageSpinner, ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { ChallanStatusBadge } from "../../components/ui/Badge";

const CAN_CREATE = ["ADMIN", "SALES"];

export function ChallansList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get("status") as ChallanStatus | null) ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [challans, setChallans] = useState<Challan[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    listChallans({ status: status || undefined, page, limit: 15 })
      .then((res) => {
        if (cancelled) return;
        setChallans(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));

    return () => {
      cancelled = true;
    };
  }, [status, page]);

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
        title="Challans"
        description="Dispatch paperwork -- draft, confirm, and track deliveries."
        actions={
          user && CAN_CREATE.includes(user.role) ? (
            <Button onClick={() => navigate("/challans/new")}>+ New Challan</Button>
          ) : undefined
        }
      />

      <Select
        value={status}
        onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}
        className="w-48"
      >
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="CANCELLED">Cancelled</option>
      </Select>

      {error && <ErrorBanner message={error} />}
      {!challans && !error && <PageSpinner />}

      {challans && challans.length === 0 && (
        <EmptyState title="No challans found" hint="Try a different status filter." />
      )}

      {challans && challans.length > 0 && (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Challan #</TH>
                <TH>Customer</TH>
                <TH>Total Qty</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <tbody>
              {challans.map((c) => (
                <TR
                  key={c.id}
                  className="cursor-pointer hover:bg-ink/[0.02]"
                  onClick={() => navigate(`/challans/${c.id}`)}
                >
                  <TD>
                    <Link
                      to={`/challans/${c.id}`}
                      className="font-tabular font-medium text-ink hover:text-forest-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.challanNumber}
                    </Link>
                  </TD>
                  <TD className="text-ink-soft">{c.customer.name}</TD>
                  <TD className="font-tabular">{c.totalQuantity}</TD>
                  <TD>
                    <ChallanStatusBadge status={c.status} />
                  </TD>
                  <TD className="font-tabular text-ink-soft">{formatDate(c.createdAt)}</TD>
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
