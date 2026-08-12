// Login: a split screen instead of the usual centered-card-on-gray-bg
// pattern. The dark panel echoes the sidebar's ink background, so the
// very first thing a user sees already carries the app's identity.

import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import { Field, inputClasses } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/Feedback";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-ink px-14 py-12 text-paper lg:flex">
        <span className="font-display text-xl font-semibold">Fundsroom</span>
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight text-paper">
            Customers, stock, and
            <br />
            challans — one ledger.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-paper/60">
            A single source of truth for your sales pipeline, inventory
            levels, and dispatch paperwork.
          </p>
        </div>
        <p className="text-xs text-paper/40">Mini ERP + CRM Portal</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-medium text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-ink-soft">Use your work email and password.</p>
          </div>

          {error && <ErrorBanner message={error} />}

          <Field label="Email" htmlFor="email" required>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses()}
              placeholder="you@fundsroom.test"
            />
          </Field>

          <Field label="Password" htmlFor="password" required>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses()}
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
