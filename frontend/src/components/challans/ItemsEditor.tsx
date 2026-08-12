// ItemsEditor: search-and-add products, edit quantities, remove lines,
// see a running total. Shared between the challan create page and the
// draft-edit mode on the detail page -- both need exactly this same
// "build up a list of {product, quantity}" interaction.

import { useCallback } from "react";
import { listProducts } from "../../api/products";
import { formatCurrency } from "../../lib/format";
import type { Product } from "../../types";
import { Card } from "../ui/Card";
import { SearchSelect } from "../ui/SearchSelect";
import { Table, THead, TH, TR, TD } from "../ui/Table";
import { EmptyState } from "../ui/Feedback";

export interface DraftItem {
  product: Product;
  quantity: number;
}

interface ItemsEditorProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

export function ItemsEditor({ items, onChange }: ItemsEditorProps) {
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
      <div className="mt-3 max-w-md">
        <SearchSelect
          placeholder="Search products by name or SKU..."
          searchFn={searchProducts}
          getLabel={(p: Product) => p.name}
          getSubLabel={(p: Product) => `${p.sku} · ${formatCurrency(p.unitPrice)} · ${p.currentStock} in stock`}
          onSelect={addProduct}
        />
      </div>

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
