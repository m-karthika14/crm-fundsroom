// CustomerForm: the "create a customer" page. (Editing happens inline
// on the detail page instead of reusing this component, since an edit
// is always a partial update against fields already on screen.)

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomer } from "../../api/customers";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import type { CustomerType } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Field, inputClasses } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/Feedback";

export function CustomerForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [type, setType] = useState<CustomerType>("RETAIL");
  const [address, setAddress] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const customer = await createCustomer({
        name,
        mobile,
        email: email || undefined,
        businessName: businessName || undefined,
        gstNumber: gstNumber || undefined,
        type,
        address,
        followUpDate: followUpDate || undefined,
      });
      navigate(`/customers/${customer.id}`);
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Customer" description="Add a lead, retail, wholesale, or distributor account." />

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && <ErrorBanner message={formError} />}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" htmlFor="name" required error={fieldErrors.name}>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses(!!fieldErrors.name)}
              />
            </Field>
            <Field label="Mobile" htmlFor="mobile" required error={fieldErrors.mobile}>
              <input
                id="mobile"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={inputClasses(!!fieldErrors.mobile)}
                placeholder="9876543210"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" htmlFor="email" error={fieldErrors.email}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses(!!fieldErrors.email)}
              />
            </Field>
            <Field label="Business name" htmlFor="businessName" error={fieldErrors.businessName}>
              <input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClasses()}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" htmlFor="type" required error={fieldErrors.type}>
              <Select id="type" value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </Select>
            </Field>
            <Field label="GST number" htmlFor="gstNumber" error={fieldErrors.gstNumber}>
              <input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className={inputClasses()}
              />
            </Field>
          </div>

          <Field label="Address" htmlFor="address" required error={fieldErrors.address}>
            <textarea
              id="address"
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClasses(!!fieldErrors.address) + " h-auto py-2"}
            />
          </Field>

          <Field label="Follow-up date" htmlFor="followUpDate" error={fieldErrors.followUpDate}>
            <input
              id="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={inputClasses()}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/customers")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Customer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
