export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "Polkadot EVM Testnet";
export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "420420417";
export const BLOCK_EXPLORER_URL =
  process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "https://blockscout-testnet.polkadot.io";

const parsedChainId = Number.parseInt(CHAIN_ID, 10);
export const CHAIN_ID_DECIMAL = Number.isNaN(parsedChainId) ? 420420417 : parsedChainId;
export const CHAIN_ID_HEX = `0x${CHAIN_ID_DECIMAL.toString(16)}`;

export const CHAIN_CONFIG = {
  chainName: CHAIN_NAME,
  chainIdDecimal: CHAIN_ID_DECIMAL,
  chainIdHex: CHAIN_ID_HEX,
  rpcUrls: RPC_URL ? [RPC_URL] : [],
  blockExplorerUrls: BLOCK_EXPLORER_URL ? [BLOCK_EXPLORER_URL] : [],
  nativeCurrency: {
    name: "Test DOT",
    symbol: "TDOT",
    decimals: 18
  }
};

export const invoiceStatuses = [
  "Draft",
  "PartiallySigned",
  "FullySigned",
  "EscrowFunded",
  "Active",
  "Matured",
  "InDispute",
  "Closed",
  "Cancelled"
];

export const milestoneStatuses = [
  "PendingFunding",
  "Funded",
  "Submitted",
  "Approved",
  "Settled",
  "Disputed"
];
