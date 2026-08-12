// CustomerDetail: view a customer's info + notes, with an inline edit
// mode (Admin/Sales only) instead of a separate edit page -- there's
// nothing here complex enough to need its own route.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCustomer, updateCustomer, addCustomerNote } from "../../api/customers";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { formatDate } from "../../lib/format";
import type { Customer, CustomerStatus, CustomerType } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Field, inputClasses } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { CustomerStatusBadge } from "../../components/ui/Badge";
import { ErrorBanner, PageSpinner } from "../../components/ui/Feedback";

const CAN_MANAGE = ["ADMIN", "SALES"];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = !!user && CAN_MANAGE.includes(user.role);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  function reload() {
    if (!id) return;
    getCustomer(id)
      .then(setCustomer)
      .catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(reload, [id]);

  if (error) return <ErrorBanner message={error} />;
  if (!customer) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={`${customer.type} · Added ${formatDate(customer.createdAt)}`}
        actions={
          <>
            <CustomerStatusBadge status={customer.status} />
            {canManage && !isEditing && (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
              Back to list
            </Button>
          </>
        }
      />

      <Card className="p-6">
        {isEditing ? (
          <EditForm
            customer={customer}
            onCancel={() => setIsEditing(false)}
            onSaved={() => {
              // Re-fetch rather than using the PUT response directly --
              // update() doesn't include the notes relation the way
              // get() does, so trusting it here would make existing
              // notes disappear from view until a manual refresh.
              reload();
              setIsEditing(false);
            }}
          />
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <InfoRow label="Mobile" value={customer.mobile} />
            <InfoRow label="Email" value={customer.email || "—"} />
            <InfoRow label="Business" value={customer.businessName || "—"} />
            <InfoRow label="GST number" value={customer.gstNumber || "—"} />
            <InfoRow label="Follow-up date" value={formatDate(customer.followUpDate)} />
            <InfoRow label="Address" value={customer.address} />
          </div>
        )}
      </Card>

      <NotesSection customer={customer} canManage={canManage} onNoteAdded={reload} />
    </div>
  );
}

function EditForm({
  customer,
  onCancel,
  onSaved,
}: {
  customer: Customer;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [mobile, setMobile] = useState(customer.mobile);
  const [email, setEmail] = useState(customer.email ?? "");
  const [businessName, setBusinessName] = useState(customer.businessName ?? "");
  const [gstNumber, setGstNumber] = useState(customer.gstNumber ?? "");
  const [type, setType] = useState<CustomerType>(customer.type);
  const [status, setStatus] = useState<CustomerStatus>(customer.status);
  const [address, setAddress] = useState(customer.address);
  const [followUpDate, setFollowUpDate] = useState(customer.followUpDate?.slice(0, 10) ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await updateCustomer(customer.id, {
        name,
        mobile,
        email: email || undefined,
        businessName: businessName || undefined,
        gstNumber: gstNumber || undefined,
        type,
        status,
        address,
        followUpDate: followUpDate || undefined,
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
        <Field label="Mobile" htmlFor="e-mobile" error={fieldErrors.mobile}>
          <input id="e-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClasses()} />
        </Field>
        <Field label="Email" htmlFor="e-email" error={fieldErrors.email}>
          <input id="e-email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses()} />
        </Field>
        <Field label="Business" htmlFor="e-business" error={fieldErrors.businessName}>
          <input
            id="e-business"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClasses()}
          />
        </Field>
        <Field label="GST number" htmlFor="e-gst" error={fieldErrors.gstNumber}>
          <input id="e-gst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className={inputClasses()} />
        </Field>
        <Field label="Follow-up date" htmlFor="e-followup" error={fieldErrors.followUpDate}>
          <input
            id="e-followup"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className={inputClasses()}
          />
        </Field>
        <Field label="Type" htmlFor="e-type" error={fieldErrors.type}>
          <Select id="e-type" value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="e-status" error={fieldErrors.status}>
          <Select id="e-status" value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Address" htmlFor="e-address" error={fieldErrors.address}>
        <textarea
          id="e-address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputClasses() + " h-auto py-2"}
        />
      </Field>
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

function NotesSection({
  customer,
  canManage,
  onNoteAdded,
}: {
  customer: Customer;
  canManage: boolean;
  onNoteAdded: () => void;
}) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await addCustomerNote(customer.id, note.trim());
      setNote("");
      onNoteAdded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-medium text-ink">Notes</h2>

      <div className="mt-4 space-y-3">
        {(customer.notes ?? []).length === 0 && <p className="text-sm text-ink-faint">No notes yet.</p>}
        {(customer.notes ?? []).map((n) => (
          <div key={n.id} className="rounded-md border border-border bg-paper px-4 py-3">
            <p className="text-sm text-ink">{n.note}</p>
            <p className="mt-1 text-xs text-ink-faint">{formatDate(n.createdAt)}</p>
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={handleAddNote} className="mt-4 space-y-2">
          {error && <ErrorBanner message={error} />}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note about this customer..."
            className={inputClasses() + " h-auto py-2"}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!note.trim()}>
              Add note
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
