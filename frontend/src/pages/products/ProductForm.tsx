import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../../api/products";
import { getErrorMessage, getFieldErrors } from "../../api/client";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Field, inputClasses } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/Feedback";

export function ProductForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currentStock, setCurrentStock] = useState("0");
  const [minStockAlert, setMinStockAlert] = useState("0");
  const [location, setLocation] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        currentStock: Number(currentStock),
        minStockAlert: Number(minStockAlert),
        location,
      });
      navigate(`/products/${product.id}`);
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Product" description="Add an item to the inventory catalog." />

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
            <Field label="SKU" htmlFor="sku" required error={fieldErrors.sku}>
              <input
                id="sku"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className={inputClasses(!!fieldErrors.sku) + " font-tabular"}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="category" required error={fieldErrors.category}>
              <input
                id="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClasses(!!fieldErrors.category)}
              />
            </Field>
            <Field label="Location" htmlFor="location" required error={fieldErrors.location}>
              <input
                id="location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClasses(!!fieldErrors.location)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Unit price" htmlFor="unitPrice" required error={fieldErrors.unitPrice}>
              <input
                id="unitPrice"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inputClasses(!!fieldErrors.unitPrice) + " font-tabular"}
              />
            </Field>
            <Field label="Opening stock" htmlFor="currentStock" error={fieldErrors.currentStock}>
              <input
                id="currentStock"
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className={inputClasses() + " font-tabular"}
              />
            </Field>
            <Field label="Low stock alert at" htmlFor="minStockAlert" error={fieldErrors.minStockAlert}>
              <input
                id="minStockAlert"
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className={inputClasses() + " font-tabular"}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Product
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
