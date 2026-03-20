export function formatAddress(value: string) {
  if (!value) return "Not set";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatToken(value: bigint) {
  return Number(value).toLocaleString();
}

export function formatTimestamp(value: bigint) {
  if (value === 0n) return "-";
  return new Date(Number(value) * 1000).toLocaleString();
}
