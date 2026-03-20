"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LiveInvoicesBoard } from "./LiveInvoicesBoard";
import { WalletConnect } from "./WalletConnect";
import { RoleSwitcher } from "./RoleSwitcher";
import { InvoiceRole } from "../lib/types";
import {
  BLOCK_EXPLORER_URL,
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  TOKEN_ADDRESS
} from "../lib/constants";

export function InvoiceDashboard() {
  const [role, setRole] = useState<InvoiceRole>("Merchant");
  const [invoiceId, setInvoiceId] = useState("");
  const [recentInvoices, setRecentInvoices] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("escrowiva_recent_invoices");
    if (stored) {
      setRecentInvoices(JSON.parse(stored));
    }
  }, []);

  function rememberInvoice(nextInvoiceId = invoiceId) {
    if (!nextInvoiceId) {
      return;
    }
    const next = Array.from(new Set([nextInvoiceId, ...recentInvoices])).slice(0, 6);
    setInvoiceId(nextInvoiceId);
    setRecentInvoices(next);
    window.localStorage.setItem("escrowiva_recent_invoices", JSON.stringify(next));
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="split-hero">
          <div className="hero-panel">
            <span className="eyebrow">Live Testnet Financing Desk</span>
            <h1>Milestone factoring with capital discipline built in.</h1>
            <p>
              Escrowiva preserves the InvoiceBTC commercial flow on a Polkadot EVM network: the client escrows the
              full invoice face value upfront, the Liquidity Provider advances discounted working capital milestone by
              milestone, and only approved milestones settle from escrow at maturity.
            </p>
            <div className="hero-links">
              <Link className="primary" href="/create-invoice">
                Launch New Invoice
              </Link>
              <Link className="ghost" href="/invoices">
                Open Live Invoices
              </Link>
            </div>
            <div className="hero-stat-grid">
              <div className="hero-stat">
                <strong>Escrow first</strong>
                <span className="meta">The client secures the full invoice amount before capital is released.</span>
              </div>
              <div className="hero-stat">
                <strong>One tranche at a time</strong>
                <span className="meta">
                  Each approval unlocks only the immediate next milestone for Liquidity Provider funding.
                </span>
              </div>
              <div className="hero-stat">
                <strong>Maturity settlement</strong>
                <span className="meta">Approved work repays the Liquidity Provider later from escrow at face value.</span>
              </div>
            </div>
          </div>

          <div className="hero-aside">
            <div className="highlight-card stack">
              <div className="section-title">
                <h3>Deployed and ready</h3>
                <span className="meta">This interface is pinned to the live Polkadot EVM testnet deployment already on-chain.</span>
              </div>
              <div className="stat-strip">
                <div className="stat-chip">
                  <span className="micro">Network</span>
                  <strong>{CHAIN_NAME}</strong>
                </div>
                <div className="stat-chip">
                  <span className="micro">Chain ID</span>
                  <strong>{CHAIN_ID || "Unset"}</strong>
                </div>
              </div>
              <div className="notice notice-info">
                Merchant, client, and Liquidity Provider wallets can all operate against the same deployed contracts
                without changing network configuration.
              </div>
              <div className="micro">Escrowiva</div>
              <div className="pill mono">{CONTRACT_ADDRESS || "Unset"}</div>
              <div className="micro">Test token</div>
              <div className="pill mono">{TOKEN_ADDRESS || "Unset"}</div>
              <div className="hero-links">
                <a
                  className="secondary"
                  href={`${BLOCK_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Escrowiva
                </a>
                <a
                  className="secondary"
                  href={`${BLOCK_EXPLORER_URL}/address/${TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View TestToken
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LiveInvoicesBoard limit={6} />

      <div className="grid">
        <WalletConnect />
        <RoleSwitcher role={role} setRole={setRole} />
        <div className="card stack workspace-card">
          <div className="section-title">
            <h3>Open Invoice Workspace</h3>
            <span className="meta">Jump into any active invoice using its on-chain ID.</span>
          </div>
          <div className="workspace-grid">
            <div className="field">
              <label>Invoice ID</label>
              <input value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} placeholder="Enter a live invoice ID" />
            </div>
            <Link
              className="primary workspace-open"
              href={invoiceId ? `/invoice/${invoiceId}` : "/invoices"}
              onClick={() => rememberInvoice()}
            >
              Open Detail View
            </Link>
          </div>
          <div className="workspace-meta">
            <div className="workspace-meta-item">
              <span className="micro">Network</span>
              <span className="pill mono">
                {CHAIN_NAME}
                {CHAIN_ID ? ` (${CHAIN_ID})` : ""}
              </span>
            </div>
            <div className="workspace-meta-item">
              <span className="micro">Contract</span>
              <span className="pill mono">{CONTRACT_ADDRESS || "Unset"}</span>
            </div>
            <div className="workspace-meta-item">
              <span className="micro">Token</span>
              <span className="pill mono">{TOKEN_ADDRESS || "Unset"}</span>
            </div>
          </div>
          <div className="row workspace-links">
            <a
              className="ghost"
              href={`${BLOCK_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              View Escrowiva
            </a>
            <a
              className="ghost"
              href={`${BLOCK_EXPLORER_URL}/address/${TOKEN_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              View TestToken
            </a>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card stack">
          <div className="section-title">
            <h3>Recent invoice shortcuts</h3>
            <span className="meta">Keep your most recent live invoices close at hand for quick review and operator continuity.</span>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="empty-state">
              <strong>No invoices opened yet.</strong>
              <span className="meta">Open an invoice once and Escrowiva will keep a quick link here for your next review.</span>
            </div>
          ) : (
            <div className="row">
              {recentInvoices.map((item) => (
                <Link key={item} className="secondary" href={`/invoice/${item}`}>
                  Invoice #{item}
                </Link>
              ))}
            </div>
          )}
          <div className="notice notice-info">
            Suggested participant setup: merchant creates and submits, client signs and escrows, and the Liquidity
            Provider advances milestones and settles at maturity.
          </div>
        </div>

        <div className="card stack">
          <div className="section-title">
            <h3>How the capital flow works</h3>
            <span className="meta">
              A trust-first sequence designed to be legible to both crypto-native and traditional finance audiences.
            </span>
          </div>
          <div className="process-grid">
            <div className="process-card">
              <div className="process-step">1</div>
              <strong>Set exact terms</strong>
              <div className="meta">Merchant defines milestone face values, advances, due dates, and maturity.</div>
            </div>
            <div className="process-card">
              <div className="process-step">2</div>
              <strong>Lock full escrow</strong>
              <div className="meta">
                Client signs and escrows the invoice face value before Liquidity Provider capital moves.
              </div>
            </div>
            <div className="process-card">
              <div className="process-step">3</div>
              <strong>Advance and verify</strong>
              <div className="meta">
                The Liquidity Provider advances the next milestone, merchant submits proof, client approves.
              </div>
            </div>
            <div className="process-card">
              <div className="process-step">4</div>
              <strong>Settle at maturity</strong>
              <div className="meta">
                Approved milestones repay the Liquidity Provider from escrow while unresolved ones move to dispute.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card stack">
        <div className="section-title">
          <h3>Operational lanes</h3>
          <span className="meta">
            Each participant has one job at a time, which keeps the financing logic legible and controlled.
          </span>
        </div>
        <div className="soft-grid">
          <div className="feature-card">
            <h4>Merchant</h4>
            <div className="meta">Creates the invoice, signs the terms, and submits milestone proof once funding is released.</div>
          </div>
          <div className="feature-card">
            <h4>Client</h4>
            <div className="meta">Confirms the invoice, funds escrow, and approves milestone completion on-chain.</div>
          </div>
          <div className="feature-card">
            <h4>Liquidity Provider</h4>
            <div className="meta">Provides discounted capital one milestone at a time and is repaid at maturity.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
