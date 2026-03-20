"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Contract } from "ethers";
import { ActionPanel } from "./ActionPanel";
import { MilestoneList } from "./MilestoneList";
import { RoleSwitcher } from "./RoleSwitcher";
import { WalletConnect } from "./WalletConnect";
import { getReadContract } from "../lib/ethereum";
import { formatAddress, formatTimestamp, formatToken } from "../lib/format";
import { invoiceStatuses } from "../lib/constants";
import { InvoiceData, InvoiceRole, InvoiceSummary, MilestoneData } from "../lib/types";

type Props = {
  invoiceId: number;
};

async function loadInvoice(contract: Contract, invoiceId: number) {
  const [invoice, milestones, summary] = await Promise.all([
    contract.getInvoice(invoiceId),
    contract.getMilestones(invoiceId),
    contract.getInvoiceSummary(invoiceId)
  ]);

  return {
    invoice: invoice as InvoiceData,
    milestones: milestones as MilestoneData[],
    summary: summary as InvoiceSummary
  };
}

export function InvoiceDetailClient({ invoiceId }: Props) {
  const [role, setRole] = useState<InvoiceRole>("Merchant");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  async function refresh() {
    try {
      setIsRefreshing(true);
      const { contract } = getReadContract();
      const data = await loadInvoice(contract, invoiceId);
      setInvoice(data.invoice);
      setMilestones(data.milestones);
      setSummary(data.summary);
      setError("");
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [invoiceId]);

  return (
    <div className="page-stack">
      <div className="row">
        <Link className="ghost" href="/">
          Back
        </Link>
        <button className="primary" onClick={() => refresh()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
        {lastUpdated ? <span className="micro">Last synced: {new Date(lastUpdated).toLocaleTimeString()}</span> : null}
      </div>

      <section className="hero">
        <div className="split-hero">
          <div className="hero-panel">
            <span className="eyebrow">Invoice Control Room</span>
            <h1>Invoice #{invoiceId}</h1>
            <p>
              Review the live milestone financing state, then move through the workflow in sequence: sign terms,
              fund escrow, advance the next milestone, submit proof, approve, settle, and close.
            </p>
            {invoice ? (
              <div className="hero-stat-grid">
                <div className="hero-stat">
                  <strong>{formatToken(invoice.totalFaceValue)}</strong>
                  <span className="meta">Invoice face value</span>
                </div>
                <div className="hero-stat">
                  <strong>{formatToken(invoice.escrowRemaining)}</strong>
                  <span className="meta">Escrow remaining</span>
                </div>
                <div className="hero-stat">
                  <strong>{invoice.milestoneCount.toString()}</strong>
                  <span className="meta">Milestones configured</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="hero-aside">
            <WalletConnect />
            <RoleSwitcher role={role} setRole={setRole} />
          </div>
        </div>
      </section>

      <div className="card stack">
        <div className="section-title">
          <h3>Invoice Snapshot</h3>
          <span className="meta">A concise read on the commercial parties, timing, and live financing status.</span>
        </div>
        {invoice ? (
          <>
            <div className="row">
              <span className="pill status">{invoiceStatuses[invoice.status]}</span>
              <span className="pill">Milestones: {invoice.milestoneCount.toString()}</span>
            </div>
            <div className="info-grid">
              <div className="info-block">
                <strong>Merchant</strong>
                <span className="meta mono">{formatAddress(invoice.merchant)}</span>
              </div>
              <div className="info-block">
                <strong>Client</strong>
                <span className="meta mono">{formatAddress(invoice.client)}</span>
              </div>
              <div className="info-block">
                <strong>Liquidity Provider</strong>
                <span className="meta mono">
                  {invoice.lp === "0x0000000000000000000000000000000000000000" ? "Unset" : formatAddress(invoice.lp)}
                </span>
              </div>
              <div className="info-block">
                <strong>Funding deadline</strong>
                <span className="meta">{formatTimestamp(invoice.fundingDeadline)}</span>
              </div>
              <div className="info-block">
                <strong>Maturity</strong>
                <span className="meta">{formatTimestamp(invoice.maturityTimestamp)}</span>
              </div>
              <div className="info-block">
                <strong>Discounted advances</strong>
                <span className="meta">{formatToken(invoice.totalDiscountedAdvance)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="state-panel state-info">
            <strong>Loading invoice</strong>
            <span className="meta">Pulling the latest on-chain invoice state from the configured testnet RPC.</span>
          </div>
        )}
        {summary ? (
          <div className="stat-strip">
            <div className="stat-chip">
              <span className="micro">Next fundable</span>
              <strong>{summary.nextFundableMilestoneId.toString()}</strong>
            </div>
            <div className="stat-chip">
              <span className="micro">Settled</span>
              <strong>{summary.settledCount.toString()}</strong>
            </div>
            <div className="stat-chip">
              <span className="micro">Disputed</span>
              <strong>{summary.disputedCount.toString()}</strong>
            </div>
            <div className="stat-chip">
              <span className="micro">Terminal</span>
              <strong>{summary.allTerminal ? "Yes" : "No"}</strong>
            </div>
          </div>
        ) : null}
        {error ? (
          <div className="state-panel state-error">
            <strong>Unable to load invoice</strong>
            <span className="meta">{error}</span>
          </div>
        ) : null}
      </div>

      <ActionPanel
        invoiceId={invoiceId}
        role={role}
        invoice={invoice}
        milestones={milestones}
        refresh={refresh}
      />

      <MilestoneList milestones={milestones} />
    </div>
  );
}
