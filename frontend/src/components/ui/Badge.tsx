// Badge: small pill used for statuses (Lead/Active/Inactive,
// Draft/Confirmed/Cancelled, IN/OUT). Centralizing the color map here
// means every page shows the same status in the same color.

import type {
  ChallanStatus,
  CustomerStatus,
  Role,
  StockMovementType,
} from "../../types";

type Tone = "neutral" | "amber" | "forest" | "rust";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink/6 text-ink-soft",
  amber: "bg-amber-100 text-amber-700",
  forest: "bg-forest-100 text-forest-700",
  rust: "bg-rust-100 text-rust-600",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const customerStatusTone: Record<CustomerStatus, Tone> = {
  LEAD: "amber",
  ACTIVE: "forest",
  INACTIVE: "neutral",
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge tone={customerStatusTone[status]}>{status}</Badge>;
}

const challanStatusTone: Record<ChallanStatus, Tone> = {
  DRAFT: "amber",
  CONFIRMED: "forest",
  CANCELLED: "rust",
};

export function ChallanStatusBadge({ status }: { status: ChallanStatus }) {
  return <Badge tone={challanStatusTone[status]}>{status}</Badge>;
}

const movementTone: Record<StockMovementType, Tone> = {
  IN: "forest",
  OUT: "amber",
};

export function StockMovementBadge({ type }: { type: StockMovementType }) {
  return <Badge tone={movementTone[type]}>{type}</Badge>;
}

const roleTone: Record<Role, Tone> = {
  ADMIN: "forest",
  SALES: "amber",
  WAREHOUSE: "neutral",
  ACCOUNTS: "neutral",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={roleTone[role]}>{role}</Badge>;
}
