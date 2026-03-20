export const escrowivaAbi = [
  "function createInvoice(address client,address token,uint256 totalFaceValue,uint256 fundingDeadline,uint256 maturityTimestamp,uint256[] milestoneFaceValues,uint256[] discountedAdvances,uint256[] dueTimestamps) returns (uint256)",
  "function clientSignInvoice(uint256 invoiceId)",
  "function merchantSignInvoice(uint256 invoiceId)",
  "function cancelDraftInvoice(uint256 invoiceId)",
  "function fundEscrow(uint256 invoiceId)",
  "function fundMilestone(uint256 invoiceId,uint256 milestoneId)",
  "function submitMilestone(uint256 invoiceId,uint256 milestoneId,bytes32 proofHash)",
  "function approveMilestone(uint256 invoiceId,uint256 milestoneId)",
  "function settleMilestone(uint256 invoiceId,uint256 milestoneId)",
  "function settleApprovedMilestones(uint256 invoiceId)",
  "function closeInvoice(uint256 invoiceId)",
  "function refundLeftover(uint256 invoiceId)",
  "function getInvoice(uint256 invoiceId) view returns ((uint256 id,address merchant,address client,address lp,address token,uint256 totalFaceValue,uint256 totalDiscountedAdvance,uint256 escrowDeposited,uint256 escrowRemaining,uint256 fundingDeadline,uint256 maturityTimestamp,uint256 milestoneCount,uint8 status,bool clientSigned,bool merchantSigned,bool isClosed,bool leftoverRefunded))",
  "function getMilestones(uint256 invoiceId) view returns ((uint256 id,uint256 invoiceId,uint256 faceValue,uint256 discountedAdvance,uint256 dueTimestamp,bytes32 proofHash,uint8 status,bool funded,bool submitted,bool approved,bool settled,bool disputed,uint256 fundedAt,uint256 submittedAt,uint256 approvedAt,uint256 settledAt)[])",
  "function getNextFundableMilestone(uint256 invoiceId) view returns (int256)",
  "function getInvoiceSummary(uint256 invoiceId) view returns ((uint256 invoiceId,uint8 status,uint256 totalFaceValue,uint256 totalDiscountedAdvance,uint256 escrowDeposited,uint256 escrowRemaining,uint256 settledCount,uint256 disputedCount,uint256 approvedCount,uint256 fundedCount,int256 nextFundableMilestoneId,bool allTerminal))",
  "event InvoiceCreated(uint256 indexed invoiceId,address indexed merchant,address indexed client,address token,uint256 totalFaceValue,uint256 totalDiscountedAdvance)"
] as const;

export const erc20Abi = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
] as const;
