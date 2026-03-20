"use client";

import { useEffect, useState } from "react";
import { TOKEN_ADDRESS } from "../lib/constants";
import { useToast } from "../lib/toast";
import { useWallet } from "../lib/wallet";

type MilestoneDraft = {
  faceValue: string;
  discountedAdvance: string;
  dueTimestamp: string;
};

const nowPlus = (days: number) => `${Math.floor(Date.now() / 1000) + days * 24 * 60 * 60}`;

export function InvoiceForm() {
  const [client, setClient] = useState("");
  const [totalFaceValue, setTotalFaceValue] = useState("1000");
  const [fundingDeadline, setFundingDeadline] = useState("");
  const [maturityTimestamp, setMaturityTimestamp] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "pending" | "success" | "error"; message: string } | null>(null);
  const { showToast } = useToast();
  const { getSignerContractBundle, isConnected, isCorrectNetwork, signer, status: walletStatus, switchNetwork } = useWallet();

  useEffect(() => {
    setFundingDeadline(nowPlus(3));
    setMaturityTimestamp(nowPlus(10));
    setMilestones([
      { faceValue: "300", discountedAdvance: "270", dueTimestamp: nowPlus(1) },
      { faceValue: "400", discountedAdvance: "360", dueTimestamp: nowPlus(4) },
      { faceValue: "300", discountedAdvance: "270", dueTimestamp: nowPlus(7) }
    ]);
  }, []);

  function updateMilestone(index: number, field: keyof MilestoneDraft, value: string) {
    const copy = [...milestones];
    copy[index] = { ...copy[index], [field]: value };
    setMilestones(copy);
  }

  function addMilestone() {
    setMilestones((current) => [
      ...current,
      { faceValue: "100", discountedAdvance: "90", dueTimestamp: nowPlus(current.length + 1) }
    ]);
  }

  async function submitInvoice() {
    try {
      if (!TOKEN_ADDRESS) {
        throw new Error("Set NEXT_PUBLIC_TOKEN_ADDRESS before creating invoices");
      }
      if (!isConnected) {
        throw new Error("Connect MetaMask before creating an invoice.");
      }
      if (!isCorrectNetwork || !signer) {
        throw new Error("Switch MetaMask to the required testnet before creating an invoice.");
      }
      setStatus({ tone: "pending", message: "Creating invoice and waiting for network confirmation..." });
      showToast({
        tone: "pending",
        title: "Invoice submission started",
        message: "Review the transaction in MetaMask to publish the agreement on-chain.",
        durationMs: 4000
      });
      const { contract } = getSignerContractBundle();
      const tx = await contract.createInvoice(
        client,
        TOKEN_ADDRESS,
        BigInt(totalFaceValue),
        BigInt(fundingDeadline),
        BigInt(maturityTimestamp),
        milestones.map((item) => BigInt(item.faceValue)),
        milestones.map((item) => BigInt(item.discountedAdvance)),
        milestones.map((item) => BigInt(item.dueTimestamp))
      );
      const receipt = await tx.wait();
      const message = `Invoice created successfully in transaction ${receipt?.hash}`;
      setStatus({ tone: "success", message });
      showToast({
        tone: "success",
        title: "Invoice created",
        message: "The agreement is now live on testnet and ready for signatures.",
        durationMs: 6000
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create invoice";
      setStatus({ tone: "error", message });
      showToast({
        tone: "error",
        title: "Invoice creation failed",
        message,
        durationMs: 6500
      });
    }
  }

  return (
    <div className="card stack">
      <div className="section-title">
        <h2>Create Invoice</h2>
        <span className="meta">
          Configure a production-style financing agreement with fixed milestones, clear maturity, and a single escrow-backed repayment path.
        </span>
      </div>
      <div className="bento">
        <div className="stack">
          <div className="field">
            <label>Client wallet address</label>
            <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="0x..." />
          </div>
          <div className="grid">
            <div className="field">
              <label>Total invoice face value</label>
              <input value={totalFaceValue} onChange={(event) => setTotalFaceValue(event.target.value)} />
            </div>
            <div className="field">
              <label>Funding deadline (unix)</label>
              <input value={fundingDeadline} onChange={(event) => setFundingDeadline(event.target.value)} />
            </div>
            <div className="field">
              <label>Maturity timestamp (unix)</label>
              <input value={maturityTimestamp} onChange={(event) => setMaturityTimestamp(event.target.value)} />
            </div>
          </div>
        </div>
        <div className="highlight-card stack">
          <div className="section-title">
            <h3>Before you submit</h3>
            <span className="meta">These terms become the commercial source of truth once both parties sign.</span>
          </div>
          <div className="stat-strip">
            <div className="stat-chip">
              <span className="micro">Token</span>
              <strong className="mono">{TOKEN_ADDRESS ? `${TOKEN_ADDRESS.slice(0, 8)}...${TOKEN_ADDRESS.slice(-6)}` : "Missing"}</strong>
            </div>
            <div className="stat-chip">
              <span className="micro">Wallet state</span>
              <strong>{!isConnected ? "Disconnected" : !isCorrectNetwork ? "Wrong network" : "Ready"}</strong>
            </div>
          </div>
          <div className="notice notice-info">
            The client escrows the full face value later. Liquidity Providers only advance the discounted amount milestone by milestone.
          </div>
        </div>
      </div>
      <div className="stack">
        {milestones.map((milestone, index) => (
          <div className="milestone stack" key={index}>
            <div className="topline">
              <strong>Milestone {index + 1}</strong>
              <span className="pill">Tranche #{index + 1}</span>
            </div>
            <div className="grid">
              <div className="field">
                <label>Face value</label>
                <input value={milestone.faceValue} onChange={(event) => updateMilestone(index, "faceValue", event.target.value)} />
              </div>
              <div className="field">
                <label>Discounted advance</label>
                <input value={milestone.discountedAdvance} onChange={(event) => updateMilestone(index, "discountedAdvance", event.target.value)} />
              </div>
              <div className="field">
                <label>Due timestamp</label>
                <input value={milestone.dueTimestamp} onChange={(event) => updateMilestone(index, "dueTimestamp", event.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="state-panel state-info">
        <strong>Public testnet only</strong>
        <span className="meta">
          This flow is configured for the live ERC-20 test token already deployed for Escrowiva. Local-only token deployment paths have been removed.
        </span>
      </div>
      {!isCorrectNetwork && isConnected ? (
        <div className="state-panel state-pending">
          <strong>Your wallet is connected, but not on the required network.</strong>
          <span className="meta">Switch MetaMask to the configured Polkadot EVM testnet before submitting invoice terms.</span>
          <div className="row">
          <button className="primary" onClick={() => switchNetwork()}>
            Switch Network To Continue
          </button>
          </div>
        </div>
      ) : null}
      <div className="row">
        <button className="ghost" onClick={addMilestone}>
          Add Milestone
        </button>
        <button className="primary" onClick={submitInvoice} disabled={!isConnected || !isCorrectNetwork || !signer}>
          Create Invoice
        </button>
      </div>
      <div className="micro">
        Wallet state: <span className="mono">{!isConnected ? "Disconnected" : !isCorrectNetwork ? "Wrong network" : walletStatus}</span>
      </div>
      <div className="micro">Token: <span className="mono">{TOKEN_ADDRESS || "Set NEXT_PUBLIC_TOKEN_ADDRESS"}</span></div>
      {status ? (
        <div className={`state-panel ${status.tone === "pending" ? "state-pending" : status.tone === "success" ? "state-success" : status.tone === "error" ? "state-error" : "state-info"}`}>
          <strong>
            {status.tone === "pending"
              ? "Submitting invoice"
              : status.tone === "success"
                ? "Invoice created"
                : status.tone === "error"
                  ? "Creation failed"
                  : "Status"}
          </strong>
          <span className="meta">{status.message}</span>
        </div>
      ) : null}
    </div>
  );
}
