// ItemsEditor: search-and-add products, edit quantities, remove lines,
// see a running total. Shared between the challan create page and the
// draft-edit mode on the detail page -- both need exactly this same
// "build up a list of {product, quantity}" interaction.
//
// Admin can also create a brand-new product inline here (via "+ New
// Product") if the one they need doesn't exist in the catalog yet --
// see the NewProductForm below. This is deliberately Admin-only:
// Sales can create challans but can't create products anywhere else
// in the app (Products CRUD is Admin/Warehouse only), so letting them
// create one here would be a quiet exception to that rule.

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProducts, createProduct, getFieldSuggestions } from "../../api/products";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { formatCurrency } from "../../lib/format";
import type { Product } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, inputClasses } from "../ui/Field";
import { SearchSelect } from "../ui/SearchSelect";
import { Table, THead, TH, TR, TD } from "../ui/Table";
import { EmptyState, ErrorBanner } from "../ui/Feedback";

export interface DraftItem {
  product: Product;
  quantity: number;
}

interface ItemsEditorProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

const CAN_CREATE_PRODUCT = ["ADMIN"];

export function ItemsEditor({ items, onChange }: ItemsEditorProps) {
  const { user } = useAuth();
  const canCreateProduct = !!user && CAN_CREATE_PRODUCT.includes(user.role);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  const searchProducts = useCallback((q: string) => listProducts({ q, limit: 8 }).then((res) => res.data), []);

  function addProduct(product: Product) {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      onChange(items.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      onChange([...items, { product, quantity: 1 }]);
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    onChange(items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
  }

  function removeItem(productId: string) {
    onChange(items.filter((i) => i.product.id !== productId));
  }

  const total = items.reduce((sum, i) => sum + i.quantity * Number(i.product.unitPrice), 0);

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-medium text-ink">Items</h2>

      <div className="mt-3 flex items-start gap-3">
        <div className="max-w-md flex-1">
          <SearchSelect
            placeholder="Search products by name or SKU..."
            searchFn={searchProducts}
            getLabel={(p: Product) => p.name}
            getSubLabel={(p: Product) => `${p.sku} · ${formatCurrency(p.unitPrice)} · ${p.currentStock} in stock`}
            onSelect={addProduct}
          />
        </div>
        {canCreateProduct && !isCreatingProduct && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreatingProduct(true)}>
            + New Product
          </Button>
        )}
      </div>

      {isCreatingProduct && (
        <NewProductForm
          onCancel={() => setIsCreatingProduct(false)}
          onCreated={(product) => {
            addProduct(product);
            setIsCreatingProduct(false);
          }}
        />
      )}

      <div className="mt-5">
        {items.length === 0 && <EmptyState title="No items yet" hint="Search above to add products." />}
        {items.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Unit price</TH>
                <TH>Quantity</TH>
                <TH>Subtotal</TH>
                <TH />
              </TR>
            </THead>
            <tbody>
              {items.map((i) => (
                <TR key={i.product.id}>
                  <TD>
                    <p className="font-medium text-ink">{i.product.name}</p>
                    <p className="font-tabular text-xs text-ink-faint">{i.product.sku}</p>
                  </TD>
                  <TD className="font-tabular">{formatCurrency(i.product.unitPrice)}</TD>
                  <TD>
                    <input
                      type="number"
                      min="1"
                      value={i.quantity}
                      onChange={(e) => updateQuantity(i.product.id, Math.max(1, Number(e.target.value)))}
                      className="font-tabular h-9 w-20 rounded-md border border-border px-2 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                    />
                  </TD>
                  <TD className="font-tabular">{formatCurrency(i.quantity * Number(i.product.unitPrice))}</TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => removeItem(i.product.id)}
                      className="text-xs text-rust-500 hover:text-rust-600"
                    >
                      Remove
                    </button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex justify-end">
          <p className="font-tabular text-lg font-semibold text-ink">Total: {formatCurrency(total)}</p>
        </div>
      )}
    </Card>
  );
}

// Same required fields as the standalone Product create page (Name,
// SKU, Category, Unit price, Location) -- just embedded inline so
// Admin doesn't have to leave the challan to add a missing product.
function NewProductForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (product: Product) => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [location, setLocation] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Existing category/location values, so typing here suggests only
  // what's already in the database instead of inviting a fresh spelling
  // of something that already exists.
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getFieldSuggestions().then((res) => {
      if (cancelled) return;
      setCategorySuggestions(res.categories);
      setLocationSuggestions(res.locations);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const product = await createProduct({
        name,
        sku,
        category,
        unitPrice: Number(unitPrice),
        location,
      });
      onCreated(product);
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-md border border-border bg-paper p-4">
      <p className="text-sm font-medium text-ink-soft">New product</p>
      {formError && (
        <div className="mt-2">
          <ErrorBanner message={formError} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Name" htmlFor="np-name" error={fieldErrors.name}>
          <input id="np-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses(!!fieldErrors.name)} />
        </Field>
        <Field label="SKU" htmlFor="np-sku" error={fieldErrors.sku}>
          <input id="np-sku" required value={sku} onChange={(e) => setSku(e.target.value)} className={inputClasses(!!fieldErrors.sku) + " font-tabular"} />
        </Field>
        <Field label="Category" htmlFor="np-category" error={fieldErrors.category}>
          <input
            id="np-category"
            required
            list="np-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClasses(!!fieldErrors.category)}
          />
          <datalist id="np-category-options">
            {categorySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Unit price" htmlFor="np-price" error={fieldErrors.unitPrice}>
          <input
            id="np-price"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className={inputClasses(!!fieldErrors.unitPrice) + " font-tabular"}
          />
        </Field>
        <Field label="Location" htmlFor="np-location" error={fieldErrors.location}>
          <input
            id="np-location"
            required
            list="np-location-options"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClasses(!!fieldErrors.location)}
          />
          <datalist id="np-location-options">
            {locationSuggestions.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          Create &amp; add
        </Button>
      </div>
    </form>
  );
}
