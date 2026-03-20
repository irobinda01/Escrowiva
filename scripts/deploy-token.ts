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

async function main() {
  requireEnv("RPC_URL");
  const tokenName = process.env.TEST_TOKEN_NAME || "Escrowiva Test USD";
  const tokenSymbol = process.env.TEST_TOKEN_SYMBOL || "eUSD";
  const initialSupplyRaw = process.env.TEST_TOKEN_INITIAL_SUPPLY || "1000000";

  const [deployer] = await ethers.getSigners();
  const initialSupply = ethers.parseUnits(initialSupplyRaw, 18);

  console.log("Deploying TestToken with:", deployer.address);
  console.log("Token name:", tokenName);
  console.log("Token symbol:", tokenSymbol);
  console.log("Initial supply:", initialSupplyRaw);

  const tokenFactory = await ethers.getContractFactory("TestToken");
  const token = await tokenFactory.deploy(
    tokenName,
    tokenSymbol,
    initialSupply,
    deployer.address
  );
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();

  console.log("TestToken deployed to:", tokenAddress);
  console.log("Token owner:", deployer.address);
  console.log("TOKEN_ADDRESS=", tokenAddress);
  console.log("NEXT_PUBLIC_TOKEN_ADDRESS=", tokenAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
