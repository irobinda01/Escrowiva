import * as dotenv from "dotenv";
import { ethers } from "hardhat";

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
  requireEnv("RPC_URL");
  const tokenAddress = requireEnv("TOKEN_ADDRESS");
  assertAddress("TOKEN_ADDRESS", tokenAddress);
  const [deployer] = await ethers.getSigners();
  const tokenCode = await ethers.provider.getCode(tokenAddress);

  if (tokenCode === "0x") {
    throw new Error("Configured TOKEN_ADDRESS has no deployed contract code on this network");
  }

  console.log("Deploying with:", deployer.address);
  console.log("Using configured testnet token:", tokenAddress);

  const escrowivaFactory = await ethers.getContractFactory("Escrowiva");
  const escrowiva = await escrowivaFactory.deploy();
  await escrowiva.waitForDeployment();

  const escrowivaAddress = await escrowiva.getAddress();

  console.log("Escrowiva deployed to:", escrowivaAddress);
  console.log("Deployer address:", deployer.address);
  console.log("TOKEN_ADDRESS=", tokenAddress);
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=", escrowivaAddress);
  console.log("NEXT_PUBLIC_TOKEN_ADDRESS=", tokenAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
