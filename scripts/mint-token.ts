import * as dotenv from "dotenv";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";

dotenv.config();

const tokenAbi = [
  "function mint(address to,uint256 amount)",
  "function balanceOf(address account) view returns (uint256)"
] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function main() {
  const rpcUrl = requireEnv("RPC_URL");
  const privateKey = requireEnv("PRIVATE_KEY");
  const tokenAddress = requireEnv("TOKEN_ADDRESS");
  const recipient = getArg("--to");
  const amountRaw = getArg("--amount");

  if (!recipient) {
    throw new Error("Missing --to <walletAddress>");
  }
  if (!amountRaw) {
    throw new Error("Missing --amount <tokenAmount>");
  }
  if (!ethers.isAddress(recipient)) {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const owner = new Wallet(privateKey, provider);
  const token = new Contract(tokenAddress, tokenAbi, owner);
  const amount = ethers.parseUnits(amountRaw, 18);

  console.log("Minting testnet tokens with owner:", owner.address);
  console.log("Token:", tokenAddress);
  console.log("Recipient:", recipient);
  console.log("Amount:", amountRaw);

  const tx = await token.mint(recipient, amount);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();

  const newBalance = await token.balanceOf(recipient);
  console.log("Mint confirmed.");
  console.log("Recipient new balance:", ethers.formatUnits(newBalance, 18));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
