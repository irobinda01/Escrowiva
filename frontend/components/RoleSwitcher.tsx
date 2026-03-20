"use client";

import { InvoiceRole } from "../lib/types";

type Props = {
  role: InvoiceRole;
  setRole: (role: InvoiceRole) => void;
};

export function RoleSwitcher({ role, setRole }: Props) {
  const roles: InvoiceRole[] = ["Merchant", "Client", "LP"];
  const roleLabels: Record<InvoiceRole, string> = {
    Merchant: "Merchant",
    Client: "Client",
    LP: "Liquidity Provider"
  };

  return (
    <div className="card stack">
      <div className="section-title">
        <h3>Role Lens</h3>
        <span className="meta">Switch the operator lens to mirror the participant leading the current step.</span>
      </div>
      <div className="row">
        {roles.map((item) => (
          <button
            key={item}
            className={item === role ? "primary" : "ghost"}
            onClick={() => setRole(item)}
          >
            {roleLabels[item]}
          </button>
        ))}
      </div>
      <div className="micro">Merchant defines terms and submits proof. Client signs, escrows, and approves. The Liquidity Provider advances and settles.</div>
    </div>
  );
}
