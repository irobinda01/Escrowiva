"use client";

import { Contract, EventLog, JsonRpcProvider, Log } from "ethers";
import { CONTRACT_ADDRESS, RPC_URL } from "./constants";
import { escrowivaAbi } from "./abi";
import { InvoiceData, InvoiceSummary, LiveInvoiceCard } from "./types";

function isEventLog(log: Log | EventLog): log is EventLog {
  return "args" in log;
}

export function getReadContract() {
  if (!RPC_URL) {
    throw new Error("Set NEXT_PUBLIC_RPC_URL for your public testnet RPC");
  }
  if (!CONTRACT_ADDRESS) {
    throw new Error("Set NEXT_PUBLIC_CONTRACT_ADDRESS for the public testnet deployment");
  }
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, escrowivaAbi, provider);
  return { provider, contract };
}

export async function getRecentInvoices(limit = 6): Promise<LiveInvoiceCard[]> {
  const { contract } = getReadContract();
  const logs = await contract.queryFilter(contract.filters.InvoiceCreated(), 0, "latest");
  const invoiceIds = Array.from(
    new Set(
      logs
        .filter(isEventLog)
        .map((log) => log.args.invoiceId)
        .filter((invoiceId): invoiceId is bigint => typeof invoiceId === "bigint")
        .reverse()
    )
  ).slice(0, limit);

  const invoices = await Promise.all(
    invoiceIds.map(async (invoiceId) => {
      const [invoice, summary] = await Promise.all([
        contract.getInvoice(invoiceId),
        contract.getInvoiceSummary(invoiceId)
      ]);

      const invoiceData = invoice as InvoiceData;
      const summaryData = summary as InvoiceSummary;

      return {
        invoiceId,
        merchant: invoiceData.merchant,
        client: invoiceData.client,
        lp: invoiceData.lp,
        status: summaryData.status,
        totalFaceValue: summaryData.totalFaceValue,
        escrowDeposited: summaryData.escrowDeposited,
        escrowRemaining: summaryData.escrowRemaining,
        maturityTimestamp: invoiceData.maturityTimestamp,
        clientSigned: invoiceData.clientSigned,
        merchantSigned: invoiceData.merchantSigned,
        nextFundableMilestoneId: BigInt(summaryData.nextFundableMilestoneId)
      } satisfies LiveInvoiceCard;
    })
  );

  return invoices;
}
