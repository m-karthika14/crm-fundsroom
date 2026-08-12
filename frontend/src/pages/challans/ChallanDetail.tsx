// ChallanDetail: view a challan's items, and -- if it's still a DRAFT
// -- edit the customer/items, confirm it, or cancel it. CONFIRMED
// challans can still be cancelled (which restores stock); CANCELLED
// is a dead end. See backend/README.md for why cancelling a CONFIRMED
// challan restores stock even though the brief doesn't spell it out.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getChallan, updateChallan, confirmChallan, cancelChallan } from "../../api/challans";
import { getErrorMessage, getInsufficientStockDetails } from "../../api/client";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Challan, Customer } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, THead, TH, TR, TD } from "../../components/ui/Table";
import { ChallanStatusBadge } from "../../components/ui/Badge";
import { ErrorBanner, PageSpinner } from "../../components/ui/Feedback";
import { CustomerPicker } from "../../components/challans/CustomerPicker";
import { ItemsEditor } from "../../components/challans/ItemsEditor";
import type { DraftItem } from "../../components/challans/ItemsEditor";

const CAN_MANAGE = ["ADMIN", "SALES"];

export function ChallanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = !!user && CAN_MANAGE.includes(user.role);

  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [insufficientStock, setInsufficientStock] = useState<ReturnType<typeof getInsufficientStockDetails>>([]);
  const [isActing, setIsActing] = useState(false);

  function reload() {
    if (!id) return;
    getChallan(id)
      .then(setChallan)
      .catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(reload, [id]);

  async function handleConfirm() {
    if (!id) return;
    setError(null);
    setInsufficientStock([]);
    setIsActing(true);
    try {
      await confirmChallan(id);
      reload();
    } catch (err) {
      const details = getInsufficientStockDetails(err);
      if (details.length > 0) {
        setInsufficientStock(details);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsActing(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setError(null);
    setIsActing(true);
    try {
      await cancelChallan(id);
      reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsActing(false);
    }
  }

  if (error && !challan) return <ErrorBanner message={error} />;
  if (!challan) return <PageSpinner />;

  const isDraft = challan.status === "DRAFT";
  const isConfirmed = challan.status === "CONFIRMED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={challan.challanNumber}
        description={`${challan.customer.name} · Created ${formatDate(challan.createdAt)}`}
        actions={
          <>
            <ChallanStatusBadge status={challan.status} />
            {canManage && isDraft && !isEditing && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInsufficientStock([]);
                  setError(null);
                  setIsEditing(true);
                }}
              >
                Edit
              </Button>
            )}
            {canManage && isDraft && !isEditing && (
              <Button size="sm" isLoading={isActing} onClick={handleConfirm}>
                Confirm
              </Button>
            )}
            {canManage && (isDraft || isConfirmed) && !isEditing && (
              <Button variant="danger" size="sm" isLoading={isActing} onClick={handleCancel}>
                Cancel Challan
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/challans")}>
              Back to list
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      {insufficientStock.length > 0 && (
        <Card className="border-rust-200 bg-rust-50 p-4">
          <p className="text-sm font-medium text-rust-600">Insufficient stock to confirm:</p>
          <ul className="mt-2 space-y-1">
            {insufficientStock.map((d) => (
              <li key={d.productId} className="font-tabular text-sm text-rust-600">
                {d.productName}: available {d.available}, requested {d.requested}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isEditing ? (
        <EditPanel
          challan={challan}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            reload();
            setIsEditing(false);
          }}
        />
      ) : (
        <>
          <Card className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Customer</p>
                <p className="mt-0.5 text-sm text-ink">{challan.customer.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Mobile</p>
                <p className="font-tabular mt-0.5 text-sm text-ink">{challan.customer.mobile}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total quantity</p>
                <p className="font-tabular mt-0.5 text-sm text-ink">{challan.totalQuantity}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-medium text-ink">Items</h2>
            <div className="mt-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH>SKU</TH>
                    <TH>Unit price</TH>
                    <TH>Quantity</TH>
                    <TH>Subtotal</TH>
                  </TR>
                </THead>
                <tbody>
                  {challan.items.map((item) => (
                    <TR key={item.id}>
                      <TD className="font-medium text-ink">{item.productNameSnapshot}</TD>
                      <TD className="font-tabular text-ink-soft">{item.productSkuSnapshot}</TD>
                      <TD className="font-tabular">{formatCurrency(item.unitPriceSnapshot)}</TD>
                      <TD className="font-tabular">{item.quantity}</TD>
                      <TD className="font-tabular">
                        {formatCurrency(Number(item.unitPriceSnapshot) * item.quantity)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
              <div className="mt-4 flex justify-end">
                <p className="font-tabular text-lg font-semibold text-ink">
                  Total:{" "}
                  {formatCurrency(
                    challan.items.reduce((sum, i) => sum + Number(i.unitPriceSnapshot) * i.quantity, 0)
                  )}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function EditPanel({ challan, onCancel, onSaved }: { challan: Challan; onCancel: () => void; onSaved: () => void }) {
  const [customer, setCustomer] = useState<Customer | null>({
    id: challan.customer.id,
    name: challan.customer.name,
    mobile: challan.customer.mobile,
  } as Customer);
  const [items, setItems] = useState<DraftItem[]>(
    challan.items.map((item) => ({
      product: {
        id: item.productId,
        name: item.productNameSnapshot,
        sku: item.productSkuSnapshot,
        unitPrice: item.unitPriceSnapshot,
        category: "",
        currentStock: 0,
        minStockAlert: 0,
        location: null,
        imageUrl: null,
        createdAt: "",
      },
      quantity: item.quantity,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    if (!customer || items.length === 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await updateChallan(challan.id, {
        customerId: customer.id,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}
      <CustomerPicker value={customer} onChange={setCustomer} />
      <ItemsEditor items={items} onChange={setItems} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} isLoading={isSubmitting} disabled={!customer || items.length === 0}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
