// ChallanCreate: pick a customer, then build up a list of products +
// quantities, then submit as a DRAFT. Stock isn't touched until the
// resulting draft is confirmed on the detail page -- this screen is
// purely about assembling the line items.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createChallan } from "../../api/challans";
import { getErrorMessage } from "../../api/client";
import type { Customer } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/Feedback";
import { CustomerPicker } from "../../components/challans/CustomerPicker";
import { ItemsEditor } from "../../components/challans/ItemsEditor";
import type { DraftItem } from "../../components/challans/ItemsEditor";

export function ChallanCreate() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!customer || items.length === 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const challan = await createChallan(
        customer.id,
        items.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
      );
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Challan" description="Build a draft, then confirm it once you're ready to dispatch." />

      {error && <ErrorBanner message={error} />}

      <CustomerPicker value={customer} onChange={setCustomer} />
      <ItemsEditor items={items} onChange={setItems} />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate("/challans")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={!customer || items.length === 0}>
          Create Draft Challan
        </Button>
      </div>
    </div>
  );
}
