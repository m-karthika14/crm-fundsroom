// ProductDetail: view/edit a product's info, record stock movements,
// and see the movement history. currentStock is shown read-only in
// the info card on purpose -- the backend rejects it on PUT, it can
// only change through the stock-movement form below, so every change
// stays logged.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getProduct,
  updateProduct,
  createStockMovement,
  getStockHistory,
  getImageUploadUrl,
  uploadImageToS3,
} from "../../api/products";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Product, StockMovement, StockMovementType } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Field, inputClasses } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Table, THead, TH, TR, TD } from "../../components/ui/Table";
import { StockMovementBadge } from "../../components/ui/Badge";
import { ErrorBanner, PageSpinner } from "../../components/ui/Feedback";

const CAN_MANAGE = ["ADMIN", "WAREHOUSE"];
const CAN_SEE_HISTORY = ["ADMIN", "WAREHOUSE", "ACCOUNTS"];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = !!user && CAN_MANAGE.includes(user.role);
  const canSeeHistory = !!user && CAN_SEE_HISTORY.includes(user.role);

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Bumped whenever a stock movement is recorded, so the (separately
  // state-managed) StockHistorySection below knows to re-fetch too.
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  function reload() {
    if (!id) return;
    getProduct(id)
      .then(setProduct)
      .catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(reload, [id]);

  if (error) return <ErrorBanner message={error} />;
  if (!product) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.category} · ${product.sku}`}
        actions={
          <>
            {canManage && !isEditing && (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
              Back to list
            </Button>
          </>
        }
      />

      <ImageSection product={product} canManage={canManage} onUploaded={reload} />

      <Card className="p-6">
        {isEditing ? (
          <EditForm product={product} onCancel={() => setIsEditing(false)} onSaved={() => { reload(); setIsEditing(false); }} />
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <InfoRow label="SKU" value={product.sku} />
            <InfoRow label="Category" value={product.category} />
            <InfoRow label="Unit price" value={formatCurrency(product.unitPrice)} />
            <InfoRow label="Current stock" value={String(product.currentStock)} />
            <InfoRow label="Low stock alert at" value={String(product.minStockAlert)} />
            <InfoRow label="Location" value={product.location || "—"} />
          </div>
        )}
      </Card>

      {canManage && (
        <StockMovementForm
          productId={product.id}
          onRecorded={() => {
            reload();
            setHistoryRefreshKey((k) => k + 1);
          }}
        />
      )}

      {canSeeHistory && <StockHistorySection productId={product.id} refreshKey={historyRefreshKey} />}
    </div>
  );
}

function EditForm({
  product,
  onCancel,
  onSaved,
}: {
  product: Product;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [category, setCategory] = useState(product.category);
  const [unitPrice, setUnitPrice] = useState(product.unitPrice);
  const [minStockAlert, setMinStockAlert] = useState(String(product.minStockAlert));
  const [location, setLocation] = useState(product.location ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await updateProduct(product.id, {
        name,
        sku,
        category,
        unitPrice: Number(unitPrice),
        minStockAlert: Number(minStockAlert),
        location,
      });
      onSaved();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError && <ErrorBanner message={formError} />}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Name" htmlFor="e-name" error={fieldErrors.name}>
          <input id="e-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses()} />
        </Field>
        <Field label="SKU" htmlFor="e-sku" error={fieldErrors.sku}>
          <input id="e-sku" value={sku} onChange={(e) => setSku(e.target.value)} className={inputClasses() + " font-tabular"} />
        </Field>
        <Field label="Category" htmlFor="e-category" error={fieldErrors.category}>
          <input id="e-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClasses()} />
        </Field>
        <Field label="Unit price" htmlFor="e-price" error={fieldErrors.unitPrice}>
          <input
            id="e-price"
            type="number"
            min="0.01"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className={inputClasses() + " font-tabular"}
          />
        </Field>
        <Field label="Low stock alert at" htmlFor="e-min" error={fieldErrors.minStockAlert}>
          <input
            id="e-min"
            type="number"
            min="0"
            value={minStockAlert}
            onChange={(e) => setMinStockAlert(e.target.value)}
            className={inputClasses() + " font-tabular"}
          />
        </Field>
        <Field label="Location" htmlFor="e-location" error={fieldErrors.location}>
          <input id="e-location" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClasses()} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function ImageSection({
  product,
  canManage,
  onUploaded,
}: {
  product: Product;
  canManage: boolean;
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      // 1. Ask the backend for a pre-signed S3 PUT URL.
      const { uploadUrl, publicUrl } = await getImageUploadUrl(product.id, file.name, file.type);
      // 2. Upload the file bytes straight to S3 -- never through our server.
      await uploadImageToS3(uploadUrl, file);
      // 3. Save the resulting public URL onto the product.
      await updateProduct(product.id, { imageUrl: publicUrl });
      onUploaded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  if (!product.imageUrl && !canManage) return null;

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-medium text-ink">Image</h2>
      {error && (
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="mt-4 flex items-center gap-5">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-28 w-28 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-md border border-dashed border-border text-xs text-ink-faint">
            No image
          </div>
        )}
        {canManage && (
          <label>
            <span className="sr-only">Upload product image</span>
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={handleFileChange}
              className="text-sm text-ink-soft file:mr-3 file:rounded-md file:border file:border-border file:bg-paper-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-paper disabled:opacity-60"
            />
            {isUploading && <p className="mt-1 text-xs text-ink-faint">Uploading…</p>}
          </label>
        )}
      </div>
    </Card>
  );
}

function StockMovementForm({ productId, onRecorded }: { productId: string; onRecorded: () => void }) {
  const [quantityChanged, setQuantityChanged] = useState("");
  const [type, setType] = useState<StockMovementType>("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createStockMovement(productId, { quantityChanged: Number(quantityChanged), type, reason });
      setQuantityChanged("");
      setReason("");
      onRecorded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-medium text-ink">Record Stock Movement</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-[120px_140px_1fr_auto] items-end gap-3">
        {error && (
          <div className="col-span-4">
            <ErrorBanner message={error} />
          </div>
        )}
        <Field label="Type" htmlFor="m-type">
          <Select id="m-type" value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </Select>
        </Field>
        <Field label="Quantity" htmlFor="m-qty">
          <input
            id="m-qty"
            type="number"
            min="1"
            required
            value={quantityChanged}
            onChange={(e) => setQuantityChanged(e.target.value)}
            className={inputClasses() + " font-tabular"}
          />
        </Field>
        <Field label="Reason" htmlFor="m-reason">
          <input
            id="m-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Restock from supplier"
            className={inputClasses()}
          />
        </Field>
        <Button type="submit" isLoading={isSubmitting}>
          Record
        </Button>
      </form>
    </Card>
  );
}

function StockHistorySection({ productId, refreshKey }: { productId: string; refreshKey: number }) {
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStockHistory(productId, { limit: 20 })
      .then((res) => !cancelled && setMovements(res.data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
    // refreshKey is bumped by the parent whenever a new movement is
    // recorded, so this section stays in sync without polling.
  }, [productId, refreshKey]);

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-medium text-ink">Stock History</h2>
      {error && <ErrorBanner message={error} />}
      {!movements && !error && <p className="mt-3 text-sm text-ink-faint">Loading…</p>}
      {movements && movements.length === 0 && <p className="mt-3 text-sm text-ink-faint">No movements yet.</p>}
      {movements && movements.length > 0 && (
        <div className="mt-4">
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>Quantity</TH>
                <TH>Reason</TH>
                <TH>Date</TH>
              </TR>
            </THead>
            <tbody>
              {movements.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <StockMovementBadge type={m.type} />
                  </TD>
                  <TD className="font-tabular">{m.quantityChanged}</TD>
                  <TD className="text-ink-soft">{m.reason}</TD>
                  <TD className="font-tabular text-ink-soft">{formatDate(m.createdAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
