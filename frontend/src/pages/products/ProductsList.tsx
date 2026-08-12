// ProductsList: search + low-stock toggle + paginated table. Same
// URL-driven filter pattern as CustomersList, so it's shareable/
// deep-linkable (the Dashboard's "Low Stock Alerts" card links here
// with ?lowStock=true).

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listProducts } from "../../api/products";
import { getErrorMessage } from "../../api/client";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { formatCurrency } from "../../lib/format";
import type { Product } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Table, THead, TH, TR, TD } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { PageSpinner, ErrorBanner, EmptyState } from "../../components/ui/Feedback";

const CAN_MANAGE = ["ADMIN", "WAREHOUSE"];

export function ProductsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const lowStock = searchParams.get("lowStock") === "true";
  const page = Number(searchParams.get("page") ?? "1");

  const [qInput, setQInput] = useState(q);
  const debouncedQ = useDebouncedValue(qInput);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debouncedQ === q) return;
    updateParams({ q: debouncedQ || undefined, page: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    listProducts({ q: q || undefined, lowStock: lowStock || undefined, page, limit: 15 })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));

    return () => {
      cancelled = true;
    };
  }, [q, lowStock, page]);

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
        title="Products"
        description="Inventory catalog and stock levels."
        actions={
          user && CAN_MANAGE.includes(user.role) ? (
            <Button onClick={() => navigate("/products/new")}>+ New Product</Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search name, SKU, category..."
          className="h-10 w-64 rounded-md border border-border bg-paper-raised px-3 text-sm placeholder:text-ink-faint focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => updateParams({ lowStock: e.target.checked ? "true" : undefined, page: undefined })}
            className="h-4 w-4 rounded border-border accent-forest-600"
          />
          Low stock only
        </label>
      </div>

      {error && <ErrorBanner message={error} />}
      {!products && !error && <PageSpinner />}

      {products && products.length === 0 && (
        <EmptyState title="No products found" hint="Try adjusting your search or filters." />
      )}

      {products && products.length > 0 && (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>SKU</TH>
                <TH>Category</TH>
                <TH>Unit price</TH>
                <TH>Stock</TH>
                <TH>Location</TH>
              </TR>
            </THead>
            <tbody>
              {products.map((p) => {
                const isLow = p.currentStock <= p.minStockAlert;
                return (
                  <TR key={p.id} className="hover:bg-ink/[0.02]">
                    <TD>
                      <Link to={`/products/${p.id}`} className="font-medium text-ink hover:text-forest-600">
                        {p.name}
                      </Link>
                    </TD>
                    <TD className="font-tabular text-ink-soft">{p.sku}</TD>
                    <TD className="text-ink-soft">{p.category}</TD>
                    <TD className="font-tabular">{formatCurrency(p.unitPrice)}</TD>
                    <TD className={`font-tabular ${isLow ? "font-semibold text-amber-600" : ""}`}>
                      {p.currentStock} / {p.minStockAlert}
                    </TD>
                    <TD className="text-ink-soft">{p.location || "—"}</TD>
                  </TR>
                );
              })}
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
