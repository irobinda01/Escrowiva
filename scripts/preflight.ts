import * as dotenv from "dotenv";
import { ethers, network } from "hardhat";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertAddress(label: string, value: string) {
  if (!ethers.isAddress(value)) {
    throw new Error(`${label} is not a valid EVM address: ${value}`);
  }
}

async function main() {
  const rpcUrl = requireEnv("RPC_URL");
  const privateKey = requireEnv("PRIVATE_KEY");
  const tokenAddress = requireEnv("TOKEN_ADDRESS");

  assertAddress("TOKEN_ADDRESS", tokenAddress);

  const provider = ethers.provider;
  const net = await provider.getNetwork();
  const feeData = await provider.getFeeData();
  const [deployer] = await ethers.getSigners();
  const code = await provider.getCode(tokenAddress);
  const balance = await provider.getBalance(deployer.address);

  console.log("Preflight network name:", network.name);
  console.log("RPC_URL:", rpcUrl);
  console.log("Chain ID:", net.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Token:", tokenAddress);
  console.log("Deployer native balance:", ethers.formatEther(balance));
  console.log(
    "Gas pricing:",
    feeData.gasPrice ? `gasPrice=${feeData.gasPrice.toString()}` : "gasPrice unavailable"
  );

  if (privateKey.startsWith("0x")) {
    console.log("PRIVATE_KEY format: includes 0x prefix");
  } else {
    console.log("PRIVATE_KEY format: no 0x prefix");
  }

  if (code === "0x") {
    throw new Error("TOKEN_ADDRESS has no bytecode on the configured network");
  }

  if (balance === 0n) {
    throw new Error("Deployer has zero native token balance for gas");
  }

  console.log("Preflight passed.");
  console.log("Next steps:");
  console.log("1. npm run deploy");
  console.log("2. Copy the printed NEXT_PUBLIC_* values into your frontend envs");
  console.log("3. Redeploy the frontend on Vercel");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
