"use client";

import { useEffect, useMemo, useState } from "react";
import { Contract, ethers } from "ethers";
import { InvoiceData, InvoiceRole, MilestoneData } from "../lib/types";
import { TOKEN_ADDRESS } from "../lib/constants";
import { useToast } from "../lib/toast";
import { useWallet } from "../lib/wallet";
import { erc20Abi } from "../lib/abi";
import { getReadContract } from "../lib/ethereum";
import { formatToken } from "../lib/format";

type Props = {
  invoiceId: number;
  role: InvoiceRole;
  invoice: InvoiceData | null;
  milestones: MilestoneData[];
  refresh: () => Promise<void>;
};

export function ActionPanel({ invoiceId, role, invoice, milestones, refresh }: Props) {
  const [proofText, setProofText] = useState("demo-proof");
  const [milestoneId, setMilestoneId] = useState("0");
  const [txState, setTxState] = useState<{ tone: "pending" | "success" | "error"; message: string } | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const { showToast } = useToast();
  const { account, getSignerContractBundle, isConnected, isCorrectNetwork, signer, status, switchNetwork } = useWallet();
  const roleLabels: Record<InvoiceRole | "Viewer", string> = {
    Merchant: "Merchant",
    Client: "Client",
    LP: "Liquidity Provider",
    Viewer: "Viewer"
  };

  const detectedRole = useMemo(() => {
    if (!invoice || !account) return "Viewer";
    const normalized = account.toLowerCase();
    if (invoice.merchant.toLowerCase() === normalized) return "Merchant";
    if (invoice.client.toLowerCase() === normalized) return "Client";
    if (invoice.lp && invoice.lp !== ethers.ZeroAddress && invoice.lp.toLowerCase() === normalized) return "LP";
    return "Viewer";
  }, [account, invoice]);

  const currentMilestone = milestones.find((item) => item.id.toString() === milestoneId) || milestones[0];
  const nextFundableMilestoneId = useMemo(() => {
    for (let index = 0; index < milestones.length; index += 1) {
      const milestone = milestones[index];
      if (milestone.funded) {
        continue;
      }
      if (index === 0) {
        return milestone.id.toString();
      }

      const previousMilestone = milestones[index - 1];
      if (previousMilestone.funded && previousMilestone.submitted && previousMilestone.approved) {
        return milestone.id.toString();
      }
      return null;
    }

    return null;
  }, [milestones]);
  const writesBlocked = !isConnected || !isCorrectNetwork || !signer;
  const connectedWalletIsClient = Boolean(
    account && invoice && invoice.client.toLowerCase() === account.toLowerCase()
  );
  const invoiceIsFullySigned = Boolean(invoice && invoice.clientSigned && invoice.merchantSigned);
  const escrowNotYetFunded = Boolean(invoice && invoice.escrowDeposited === 0n);
  const hasSufficientEscrowBalance = Boolean(
    invoice && tokenBalance !== null && tokenBalance >= invoice.totalFaceValue
  );
  const canFundEscrow = Boolean(
    invoice &&
      !writesBlocked &&
      connectedWalletIsClient &&
      invoiceIsFullySigned &&
      escrowNotYetFunded &&
      hasSufficientEscrowBalance
  );
  const milestoneFundingSequenceReady = Boolean(
    invoice &&
      invoice.escrowDeposited === invoice.totalFaceValue &&
      currentMilestone &&
      nextFundableMilestoneId !== null &&
      currentMilestone.id.toString() === nextFundableMilestoneId
  );
  const canFundMilestone = Boolean(currentMilestone && !writesBlocked && milestoneFundingSequenceReady);
  const escrowBlockers = [
    !invoiceIsFullySigned ? "Both the client and merchant must sign the invoice first." : null,
    !connectedWalletIsClient ? "The connected wallet must match the designated client address." : null,
    invoice && !escrowNotYetFunded ? "Escrow has already been funded for this invoice." : null,
    invoice && connectedWalletIsClient && tokenBalance !== null && tokenBalance < invoice.totalFaceValue
      ? `Client balance is ${formatToken(tokenBalance)}, but ${formatToken(invoice.totalFaceValue)} is required for escrow.`
      : null,
    !isConnected ? "Connect MetaMask before funding escrow." : null,
    isConnected && !isCorrectNetwork ? "Switch MetaMask to the configured testnet before funding escrow." : null,
    isConnected && isCorrectNetwork && !signer ? "Signer is unavailable in the current wallet session." : null
  ].filter(Boolean) as string[];
  const milestoneFundingBlockers = [
    invoice && invoice.escrowDeposited !== invoice.totalFaceValue
      ? "Escrow must be fully funded before a Liquidity Provider can advance a milestone."
      : null,
    nextFundableMilestoneId === null
      ? "No milestone is currently eligible for funding. Complete the previous funded milestone first."
      : null,
    currentMilestone && nextFundableMilestoneId !== null && currentMilestone.id.toString() !== nextFundableMilestoneId
      ? `Milestone ${nextFundableMilestoneId} is the next eligible tranche.`
      : null,
    !isConnected ? "Connect MetaMask before funding a milestone." : null,
    isConnected && !isCorrectNetwork ? "Switch MetaMask to the configured testnet before funding a milestone." : null,
    isConnected && isCorrectNetwork && !signer ? "Signer is unavailable in the current wallet session." : null
  ].filter(Boolean) as string[];

  useEffect(() => {
    let cancelled = false;

    async function loadTokenBalance() {
      if (!account || !invoice) {
        setTokenBalance(null);
        setIsBalanceLoading(false);
        return;
      }

      try {
        setIsBalanceLoading(true);
        const { provider } = getReadContract();
        const tokenContract = new Contract(invoice.token, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(account);
        if (!cancelled) {
          setTokenBalance(balance as bigint);
        }
      } catch {
        if (!cancelled) {
          setTokenBalance(null);
        }
      } finally {
        if (!cancelled) {
          setIsBalanceLoading(false);
        }
      }
    }

    loadTokenBalance().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [account, invoice]);

  useEffect(() => {
    if (!nextFundableMilestoneId) {
      return;
    }

    const selectedMilestone = milestones.find((item) => item.id.toString() === milestoneId);
    if (!selectedMilestone || selectedMilestone.funded) {
      setMilestoneId(nextFundableMilestoneId);
    }
  }, [milestoneId, milestones, nextFundableMilestoneId]);

  async function runAction(label: string, action: () => Promise<void>) {
    try {
      if (writesBlocked) {
        throw new Error(
          !isConnected
            ? "Connect MetaMask before sending transactions."
            : !isCorrectNetwork
              ? "Switch MetaMask to the required testnet before sending transactions."
              : "Signer is unavailable."
        );
      }

      setTxState({ tone: "pending", message: `${label}: review the transaction in MetaMask to continue.` });
      showToast({
        tone: "pending",
        title: `${label} started`,
        message: "MetaMask is ready for your confirmation. We’ll keep the action disabled until it completes.",
        durationMs: 4000
      });
      await action();
      setTxState({ tone: "success", message: `${label}: confirmed on-chain.` });
      showToast({
        tone: "success",
        title: `${label} confirmed`,
        message: "The live testnet state has been updated successfully.",
        durationMs: 5200
      });
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? `${label}: ${error.message}` : `${label}: transaction failed`;
      setTxState({
        tone: "error",
        message
      });
      showToast({
        tone: "error",
        title: `${label} failed`,
        message,
        durationMs: 6500
      });
    }
  }

  async function approveTokenIfNeeded(amount: bigint) {
    const { signer: activeSigner, token, contract } = getSignerContractBundle();
    const owner = await activeSigner.getAddress();
    const allowance = await token.allowance(owner, await contract.getAddress());
    if (allowance < amount) {
      const approveTx = await token.approve(await contract.getAddress(), amount);
      await approveTx.wait();
    }
  }

  return (
    <div className="card stack">
      <div className="topline">
        <div className="section-title">
          <h3>Live Action Console</h3>
          <span className="meta">
            Run the invoice exactly in order: sign, escrow, fund, submit proof, approve, settle, then close.
          </span>
        </div>
        <div className="row">
          <span className="pill">Selected role: {roleLabels[role]}</span>
          <span className="pill">Detected role: {roleLabels[detectedRole]}</span>
        </div>
      </div>
      <div className="stat-strip">
        <div className="stat-chip">
          <span className="micro">Settlement token</span>
          <strong className="mono">{TOKEN_ADDRESS ? `${TOKEN_ADDRESS.slice(0, 8)}...${TOKEN_ADDRESS.slice(-6)}` : "Unset"}</strong>
        </div>
        <div className="stat-chip">
          <span className="micro">Write status</span>
          <strong>{writesBlocked ? "Restricted" : "Ready"}</strong>
        </div>
        <div className="stat-chip">
          <span className="micro">Client token balance</span>
          <strong>
            {!account || !invoice
              ? "-"
              : isBalanceLoading
                ? "Loading..."
                : tokenBalance === null
                  ? "Unavailable"
                  : formatToken(tokenBalance)}
          </strong>
        </div>
        <div className="stat-chip">
          <span className="micro">Target milestone</span>
          <strong>#{currentMilestone ? currentMilestone.id.toString() : milestoneId}</strong>
        </div>
        <div className="stat-chip">
          <span className="micro">Next fundable</span>
          <strong>{nextFundableMilestoneId ?? "-"}</strong>
        </div>
      </div>
      <div className="row">
        <span className={`pill ${writesBlocked ? "status-danger" : "status"}`}>
          {writesBlocked ? (status === "wrong_network" ? "Wrong network" : "Writes blocked") : "Writes enabled"}
        </span>
        <span className="pill mono">Token: {TOKEN_ADDRESS || "Unset"}</span>
      </div>
      {invoice && !canFundEscrow ? (
        <div className="state-panel state-info">
          <strong>Escrow funding has strict prerequisites.</strong>
          <span className="meta">
            Fund Escrow only becomes available when every escrow precondition is satisfied on the live contract state.
          </span>
          {escrowBlockers.length ? (
            <div className="stack stack-tight">
              {escrowBlockers.map((blocker) => (
                <span key={blocker} className="meta">
                  {blocker}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {invoice && !canFundMilestone ? (
        <div className="state-panel state-info">
          <strong>Milestone funding follows the live contract sequence.</strong>
          <span className="meta">
            Escrowiva only allows the Liquidity Provider to fund the next unlocked milestone after the prior tranche
            has been funded, submitted, and approved.
          </span>
          {milestoneFundingBlockers.length ? (
            <div className="stack stack-tight">
              {milestoneFundingBlockers.map((blocker) => (
                <span key={blocker} className="meta">
                  {blocker}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {!isCorrectNetwork && isConnected ? (
        <div className="state-panel state-pending">
          <strong>Switch to the configured testnet before sending transactions.</strong>
          <span className="meta">
            Escrowiva is pinned to a single live network. We block writes until MetaMask is aligned with that chain.
          </span>
          <div className="row">
          <button className="primary" onClick={() => switchNetwork()}>
            Switch Network To Continue
          </button>
          </div>
        </div>
      ) : null}

      <div className="grid-2">
        <div className="field">
          <label>Milestone target</label>
          <select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}>
            {milestones.map((item) => (
              <option key={item.id.toString()} value={item.id.toString()}>
                {item.id.toString()}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Proof reference seed</label>
          <input value={proofText} onChange={(event) => setProofText(event.target.value)} placeholder="delivery-proof-001" />
        </div>
      </div>

      <div className="muted-divider" />

      <div className="section-title">
        <h4>Agreement setup</h4>
        <span className="micro">First signatures lock the terms. Escrow must be funded before any Liquidity Provider advance begins.</span>
      </div>
      <div className="actions-grid">
        <button className="primary" onClick={() => runAction("Client sign", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.clientSignInvoice(invoiceId);
          await tx.wait();
        })} disabled={writesBlocked}>
          Client Sign
        </button>
        <button className="primary" onClick={() => runAction("Merchant sign", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.merchantSignInvoice(invoiceId);
          await tx.wait();
        })} disabled={writesBlocked}>
          Merchant Sign
        </button>
        <button className="primary" onClick={() => runAction("Fund escrow", async () => {
          if (!invoice) throw new Error("Invoice not loaded");
          await approveTokenIfNeeded(invoice.totalFaceValue);
          const { contract } = getSignerContractBundle();
          const tx = await contract.fundEscrow(invoiceId);
          await tx.wait();
        })} disabled={!canFundEscrow}>
          Fund Escrow
        </button>
      </div>

      <div className="section-title">
        <h4>Milestone execution</h4>
        <span className="micro">Advance one milestone, submit proof, then approve to unlock the next tranche.</span>
      </div>
      <div className="actions-grid">
        <button className="secondary" onClick={() => runAction("Fund milestone", async () => {
          if (!currentMilestone) throw new Error("Milestone not loaded");
          await approveTokenIfNeeded(currentMilestone.discountedAdvance);
          const { contract } = getSignerContractBundle();
          const tx = await contract.fundMilestone(invoiceId, Number(milestoneId));
          await tx.wait();
        })} disabled={!canFundMilestone}>
          Fund Milestone
        </button>
        <button className="secondary" onClick={() => runAction("Submit milestone", async () => {
          const { contract } = getSignerContractBundle();
          const proofHash = ethers.keccak256(ethers.toUtf8Bytes(proofText));
          const tx = await contract.submitMilestone(invoiceId, Number(milestoneId), proofHash);
          await tx.wait();
        })} disabled={writesBlocked}>
          Submit Proof
        </button>
        <button className="secondary" onClick={() => runAction("Approve milestone", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.approveMilestone(invoiceId, Number(milestoneId));
          await tx.wait();
        })} disabled={writesBlocked}>
          Approve Milestone
        </button>
      </div>

      <div className="section-title">
        <h4>Maturity and closure</h4>
        <span className="micro">Settle approved milestones at maturity, mark unresolved ones disputed, then close and refund any leftover escrow.</span>
      </div>
      <div className="actions-grid">
        <button className="secondary" onClick={() => runAction("Settle milestone", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.settleMilestone(invoiceId, Number(milestoneId));
          await tx.wait();
        })} disabled={writesBlocked}>
          Settle One
        </button>
        <button className="secondary" onClick={() => runAction("Settle approved milestones", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.settleApprovedMilestones(invoiceId);
          await tx.wait();
        })} disabled={writesBlocked}>
          Settle Approved
        </button>
        <button className="secondary" onClick={() => runAction("Close invoice", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.closeInvoice(invoiceId);
          await tx.wait();
        })} disabled={writesBlocked}>
          Close Invoice
        </button>
        <button className="secondary" onClick={() => runAction("Refund leftover", async () => {
          const { contract } = getSignerContractBundle();
          const tx = await contract.refundLeftover(invoiceId);
          await tx.wait();
        })} disabled={writesBlocked}>
          Refund Leftover
        </button>
      </div>

      {txState ? (
        <div className={`state-panel ${txState.tone === "pending" ? "state-pending" : txState.tone === "success" ? "state-success" : "state-error"}`}>
          <strong>
            {txState.tone === "pending"
              ? "Transaction in progress"
              : txState.tone === "success"
                ? "Transaction confirmed"
                : "Transaction failed"}
          </strong>
          <span className="meta">{txState.message}</span>
        </div>
      ) : (
        <div className="state-panel state-info">
          <strong>Nothing pending right now.</strong>
          <span className="meta">
            Choose the participant, pick the milestone, and Escrowiva will route the next action through MetaMask.
          </span>
        </div>
      )}
    </div>
  );
}
