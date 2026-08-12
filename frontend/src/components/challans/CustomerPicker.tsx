// CustomerPicker: search-and-select a customer, or show the currently
// selected one with a "Change" button. Shared between the challan
// create page and the draft-edit mode on the detail page.

import { useCallback } from "react";
import { listCustomers } from "../../api/customers";
import type { Customer } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SearchSelect } from "../ui/SearchSelect";

interface CustomerPickerProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}

export function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const searchCustomers = useCallback(
    (q: string) => listCustomers({ q, limit: 8 }).then((res) => res.data),
    []
  );

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-medium text-ink">Customer</h2>
      {value ? (
        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-paper px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">{value.name}</p>
            <p className="font-tabular text-xs text-ink-faint">{value.mobile}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      ) : (
        <div className="mt-3 max-w-md">
          <SearchSelect
            placeholder="Search customers by name or mobile..."
            searchFn={searchCustomers}
            getLabel={(c: Customer) => c.name}
            getSubLabel={(c: Customer) => c.mobile}
            onSelect={onChange}
          />
        </div>
      )}
    </Card>
  );
}
