export type InvoiceRole = "Merchant" | "Client" | "LP";

export type InvoiceData = {
  id: bigint;
  merchant: string;
  client: string;
  lp: string;
  token: string;
  totalFaceValue: bigint;
  totalDiscountedAdvance: bigint;
  escrowDeposited: bigint;
  escrowRemaining: bigint;
  fundingDeadline: bigint;
  maturityTimestamp: bigint;
  milestoneCount: bigint;
  status: number;
  clientSigned: boolean;
  merchantSigned: boolean;
  isClosed: boolean;
  leftoverRefunded: boolean;
};

export type MilestoneData = {
  id: bigint;
  invoiceId: bigint;
  faceValue: bigint;
  discountedAdvance: bigint;
  dueTimestamp: bigint;
  proofHash: string;
  status: number;
  funded: boolean;
  submitted: boolean;
  approved: boolean;
  settled: boolean;
  disputed: boolean;
  fundedAt: bigint;
  submittedAt: bigint;
  approvedAt: bigint;
  settledAt: bigint;
};

export type InvoiceSummary = {
  invoiceId: bigint;
  status: number;
  totalFaceValue: bigint;
  totalDiscountedAdvance: bigint;
  escrowDeposited: bigint;
  escrowRemaining: bigint;
  settledCount: bigint;
  disputedCount: bigint;
  approvedCount: bigint;
  fundedCount: bigint;
  nextFundableMilestoneId: bigint;
  allTerminal: boolean;
};

export type LiveInvoiceCard = {
  invoiceId: bigint;
  merchant: string;
  client: string;
  lp: string;
  status: number;
  totalFaceValue: bigint;
  escrowDeposited: bigint;
  escrowRemaining: bigint;
  maturityTimestamp: bigint;
  clientSigned: boolean;
  merchantSigned: boolean;
  nextFundableMilestoneId: bigint;
};
