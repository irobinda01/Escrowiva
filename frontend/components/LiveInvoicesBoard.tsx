"use client";

import { ZeroAddress } from "ethers";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getRecentInvoices } from "../lib/ethereum";
import { formatAddress, formatTimestamp, formatToken } from "../lib/format";
import { LiveInvoiceCard } from "../lib/types";
import { invoiceStatuses } from "../lib/constants";
import { useWallet } from "../lib/wallet";

type Props = {
  limit?: number;
  title?: string;
  description?: string;
};

type InvoiceFilter =
  | "all"
  | "client_wallet"
  | "awaiting_client_signature"
  | "awaiting_escrow"
  | "awaiting_liquidity_provider_funding";

export function LiveInvoicesBoard({
  limit = 12,
  title = "Live Testnet Invoices",
  description = "Recent invoices discovered directly from the deployed Escrowiva contract on the connected testnet."
}: Props) {
  const { account, isConnected } = useWallet();
  const [liveInvoices, setLiveInvoices] = useState<LiveInvoiceCard[]>([]);
  const [liveInvoicesLoading, setLiveInvoicesLoading] = useState(true);
  const [liveInvoicesError, setLiveInvoicesError] = useState("");
  const [liveInvoicesLastUpdated, setLiveInvoicesLastUpdated] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<InvoiceFilter>("all");

  async function loadLiveInvoices() {
    try {
      setLiveInvoicesLoading(true);
      const invoices = await getRecentInvoices(limit);
      setLiveInvoices(invoices);
      setLiveInvoicesError("");
      setLiveInvoicesLastUpdated(Date.now());
    } catch (error) {
      setLiveInvoicesError(error instanceof Error ? error.message : "Failed to load live invoices");
    } finally {
      setLiveInvoicesLoading(false);
    }
  }

  useEffect(() => {
    loadLiveInvoices().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      loadLiveInvoices().catch(() => undefined);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [limit]);

  const filteredInvoices = useMemo(() => {
    const normalizedAccount = account.toLowerCase();

    return liveInvoices.filter((invoice) => {
      switch (activeFilter) {
        case "client_wallet":
          return isConnected && invoice.client.toLowerCase() === normalizedAccount;
        case "awaiting_client_signature":
          return !invoice.clientSigned;
        case "awaiting_escrow":
          return invoice.clientSigned && invoice.merchantSigned && invoice.escrowDeposited === 0n;
        case "awaiting_liquidity_provider_funding":
          return (
            invoice.escrowDeposited > 0n &&
            invoice.nextFundableMilestoneId >= 0n &&
            invoice.lp === ZeroAddress
          );
        case "all":
        default:
          return true;
      }
    });
  }, [account, activeFilter, isConnected, liveInvoices]);

  const filters: Array<{ id: InvoiceFilter; label: string }> = [
    { id: "all", label: "All invoices" },
    { id: "client_wallet", label: "My client invoices" },
    { id: "awaiting_client_signature", label: "Awaiting client signature" },
    { id: "awaiting_escrow", label: "Awaiting escrow" },
    { id: "awaiting_liquidity_provider_funding", label: "Awaiting Liquidity Provider funding" }
  ];

  return (
    <div className="card stack">
      <div className="topline">
        <div className="section-title">
          <h3>{title}</h3>
          <span className="meta">{description}</span>
        </div>
        <div className="row">
          {liveInvoicesLastUpdated ? (
            <span className="micro">Last synced: {new Date(liveInvoicesLastUpdated).toLocaleTimeString()}</span>
          ) : null}
          <button className="ghost" type="button" onClick={() => loadLiveInvoices()} disabled={liveInvoicesLoading}>
            {liveInvoicesLoading ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>
      </div>

      <div className="row">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={activeFilter === filter.id ? "primary" : "ghost"}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {activeFilter === "client_wallet" && !isConnected ? (
        <div className="state-panel state-info">
          <strong>Connect a wallet to use the client filter.</strong>
          <span className="meta">
            Once connected, this view will show invoices where the active wallet is the designated client.
          </span>
        </div>
      ) : null}

      {liveInvoicesLoading ? (
        <div className="state-panel state-info">
          <strong>Loading live invoices</strong>
          <span className="meta">
            Reading recent InvoiceCreated events and invoice summaries from the deployed testnet contract.
          </span>
        </div>
      ) : null}
      {liveInvoicesError ? (
        <div className="state-panel state-error">
          <strong>Unable to load live invoices</strong>
          <span className="meta">{liveInvoicesError}</span>
        </div>
      ) : null}
      {!liveInvoicesLoading && !liveInvoicesError && filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <strong>No invoices match this view yet.</strong>
          <span className="meta">
            {activeFilter === "all"
              ? "Create the first invoice on this testnet deployment and it will appear here automatically."
              : "Try another filter or wait for new on-chain activity to appear on the testnet."}
          </span>
        </div>
      ) : null}
      {!liveInvoicesLoading && filteredInvoices.length > 0 ? (
        <div className="stack">
          {filteredInvoices.map((item) => (
            <div className="milestone stack" key={item.invoiceId.toString()}>
              <div className="topline">
                <div className="row">
                  <span className="pill">Invoice #{item.invoiceId.toString()}</span>
                  <span className="pill status-soft">{invoiceStatuses[item.status]}</span>
                </div>
                <Link className="secondary" href={`/invoice/${item.invoiceId.toString()}`}>
                  Open invoice
                </Link>
              </div>
              <div className="info-grid">
                <div className="info-block">
                  <strong>Face value</strong>
                  <span className="meta">{formatToken(item.totalFaceValue)}</span>
                </div>
                <div className="info-block">
                  <strong>Escrow deposited</strong>
                  <span className="meta">{formatToken(item.escrowDeposited)}</span>
                </div>
                <div className="info-block">
                  <strong>Escrow remaining</strong>
                  <span className="meta">{formatToken(item.escrowRemaining)}</span>
                </div>
                <div className="info-block">
                  <strong>Merchant</strong>
                  <span className="meta mono">{formatAddress(item.merchant)}</span>
                </div>
                <div className="info-block">
                  <strong>Client</strong>
                  <span className="meta mono">{formatAddress(item.client)}</span>
                </div>
                <div className="info-block">
                  <strong>Maturity</strong>
                  <span className="meta">{formatTimestamp(item.maturityTimestamp)}</span>
                </div>
                <div className="info-block">
                  <strong>Client signed</strong>
                  <span className="meta">{item.clientSigned ? "Yes" : "No"}</span>
                </div>
                <div className="info-block">
                  <strong>Merchant signed</strong>
                  <span className="meta">{item.merchantSigned ? "Yes" : "No"}</span>
                </div>
                <div className="info-block">
                  <strong>Next fundable milestone</strong>
                  <span className="meta">
                    {item.nextFundableMilestoneId >= 0n ? item.nextFundableMilestoneId.toString() : "None"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
