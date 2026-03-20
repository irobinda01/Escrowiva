# Escrowiva

Escrowiva is a milestone-based invoice factoring MVP for the Polkadot EVM public testnet. The codebase is now cleaned up for testnet use only, and the frontend is connected to the live deployed contracts below.

## Live Testnet Deployment

- `Escrowiva`: `0xCdF6fdF06Ba6fc33C22f40Fee04f85C232623738`
- `TestToken (eUSD)`: `0x85101691A00Fef98D317dE547f5bc678dfFF7e34`
- RPC: `https://services.polkadothub-rpc.com/testnet`
- Chain ID: `420420417`
- Explorer: `https://blockscout-testnet.polkadot.io`

Explorer links:

- Escrowiva: `https://blockscout-testnet.polkadot.io/address/0xCdF6fdF06Ba6fc33C22f40Fee04f85C232623738`
- TestToken: `https://blockscout-testnet.polkadot.io/address/0x85101691A00Fef98D317dE547f5bc678dfFF7e34`

## Frontend Connection

The local frontend is already pointed at the deployed contracts through:

- [frontend/.env.local](c:\Users\HP\Desktop\Escrowiva\frontend\.env.local)

Those values are:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xCdF6fdF06Ba6fc33C22f40Fee04f85C232623738
NEXT_PUBLIC_TOKEN_ADDRESS=0x85101691A00Fef98D317dE547f5bc678dfFF7e34
NEXT_PUBLIC_RPC_URL=https://services.polkadothub-rpc.com/testnet
NEXT_PUBLIC_CHAIN_NAME=Polkadot EVM Testnet
NEXT_PUBLIC_CHAIN_ID=420420417
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://blockscout-testnet.polkadot.io
```

## Wallet Flow

The frontend now uses a single shared MetaMask wallet layer for all pages and contract writes.

Supported wallet/network:

- MetaMask
- Polkadot EVM Testnet
- Chain ID: `420420417`

Connection behavior:

- the app restores session state on refresh with `eth_accounts` and `eth_chainId`
- the app does not auto-request wallet access on page load
- wallet access is requested only when the user clicks `Connect MetaMask`
- if MetaMask is on the wrong network, the app first tries `wallet_switchEthereumChain`
- if the network is missing in MetaMask, the app falls back to `wallet_addEthereumChain` and retries the switch
- account, chain, and disconnect events are subscribed globally and update the app immediately
- contract write buttons are blocked when the wallet is disconnected, the signer is unavailable, or the chain is wrong
- `Reset Wallet State` clears the app-side wallet state only; MetaMask does not support a true forced disconnect for injected dapps

## File Tree

```text
.
|-- .env.example
|-- .gitignore
|-- .nvmrc
|-- README.md
|-- contracts
|   |-- Escrowiva.sol
|   `-- TestToken.sol
|-- frontend
|   |-- .env.example
|   |-- .env.local
|   |-- app
|   |   |-- create-invoice
|   |   |   `-- page.tsx
|   |   |-- invoice
|   |   |   `-- [id]
|   |   |       `-- page.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components
|   |   |-- ActionPanel.tsx
|   |   |-- InvoiceDashboard.tsx
|   |   |-- InvoiceDetailClient.tsx
|   |   |-- InvoiceForm.tsx
|   |   |-- MilestoneList.tsx
|   |   |-- RoleSwitcher.tsx
|   |   `-- WalletConnect.tsx
|   |-- lib
|   |   |-- abi.ts
|   |   |-- constants.ts
|   |   |-- ethereum.ts
|   |   |-- format.ts
|   |   `-- types.ts
|   |-- next-env.d.ts
|   |-- next.config.ts
|   |-- package.json
|   `-- tsconfig.json
|-- hardhat.config.ts
|-- package.json
|-- scripts
|   |-- deploy-token.ts
|   |-- deploy.ts
|   `-- preflight.ts
|-- vercel.json
`-- tsconfig.json
```

## Environment Variables

The examples are now prefilled for this deployment target.

Root `.env.example`:

```bash
RPC_URL=https://services.polkadothub-rpc.com/testnet
PRIVATE_KEY=your_private_key_without_0x
TOKEN_ADDRESS=0x85101691A00Fef98D317dE547f5bc678dfFF7e34
TEST_TOKEN_NAME=Escrowiva Test USD
TEST_TOKEN_SYMBOL=eUSD
TEST_TOKEN_INITIAL_SUPPLY=1000000
NEXT_PUBLIC_CONTRACT_ADDRESS=0xCdF6fdF06Ba6fc33C22f40Fee04f85C232623738
NEXT_PUBLIC_TOKEN_ADDRESS=0x85101691A00Fef98D317dE547f5bc678dfFF7e34
NEXT_PUBLIC_RPC_URL=https://services.polkadothub-rpc.com/testnet
NEXT_PUBLIC_CHAIN_NAME=Polkadot EVM Testnet
NEXT_PUBLIC_CHAIN_ID=420420417
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://blockscout-testnet.polkadot.io
```

## Step-By-Step Guide To Deploy The MVP To Vercel

### 1. Push the latest repo

Push the current codebase to the Git provider you use with Vercel.

Important:

- [frontend/.env.local](c:\Users\HP\Desktop\Escrowiva\frontend\.env.local) is local-only and ignored by git
- Vercel will not read your local env file
- you must still add the same public env values in the Vercel dashboard

### 2. Create the Vercel project

1. Open Vercel
2. Click `Add New...`
3. Click `Project`
4. Import the Escrowiva repository

### 3. Confirm project settings

Use these settings:

- Framework Preset: `Next.js`
- Root Directory: repository root
- Node.js Version: `22.x`

The repo already includes [vercel.json](c:\Users\HP\Desktop\Escrowiva\vercel.json), so Vercel will use the root install/build commands that delegate into `frontend/`.

### 4. Add environment variables in Vercel

In the Vercel project settings, add these exact variables:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xCdF6fdF06Ba6fc33C22f40Fee04f85C232623738
NEXT_PUBLIC_TOKEN_ADDRESS=0x85101691A00Fef98D317dE547f5bc678dfFF7e34
NEXT_PUBLIC_RPC_URL=https://services.polkadothub-rpc.com/testnet
NEXT_PUBLIC_CHAIN_NAME=Polkadot EVM Testnet
NEXT_PUBLIC_CHAIN_ID=420420417
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://blockscout-testnet.polkadot.io
```

Apply them to:

- Production
- Preview
- Development

### 5. Trigger the first deployment

1. Click `Deploy`
2. Wait for the build to finish
3. Open the deployed site URL

### 6. Verify the live frontend is connected correctly

On the deployed site:

1. Open the dashboard
2. Check that the network shown is `Polkadot EVM Testnet (420420417)`
3. Check that the contract shown is `0xCdF6fdF06Ba6fc33C22f40Fee04f85C232623738`
4. Check that the token shown is `0x85101691A00Fef98D317dE547f5bc678dfFF7e34`
5. Click `View Escrowiva`
6. Click `View TestToken`
7. Confirm both explorer links open the correct addresses

### 7. Connect MetaMask to the same testnet

In MetaMask, add or switch to:

- Chain name: `Polkadot EVM Testnet`
- Chain ID: `420420417`
- RPC URL: `https://services.polkadothub-rpc.com/testnet`

Then connect your wallet inside the app.

### 8. Run a smoke test on the live MVP

Use your merchant, client, and LP wallets:

1. Merchant creates a new invoice
2. Client signs the invoice
3. Merchant signs the invoice
4. Client funds escrow using `eUSD`
5. LP funds milestone `0`
6. Merchant submits proof
7. Client approves milestone `0`
8. Confirm the next milestone becomes fundable

### 9. If something is wrong

Check these in order:

1. Vercel env vars exactly match the values above
2. You triggered a redeploy after setting env vars
3. MetaMask is on chain `420420417`
4. The connected wallet has native gas token
5. The connected wallet has enough `eUSD`
6. The Vercel site shows the same contract and token addresses listed in this README

## Manual Wallet Test Steps

Before sharing the MVP, verify these cases manually:

1. Open the site with MetaMask locked or disconnected
   The UI should show a clean connect state and no write action should be usable
2. Open the site with MetaMask missing
   The UI should show an install prompt instead of a broken connect flow
3. Connect MetaMask while already on chain `420420417`
   The wallet should connect cleanly and writes should become enabled
4. Connect MetaMask while on the wrong EVM chain
   The app should try to switch networks automatically
5. If the chain is not added in MetaMask
   The app should try to add it, then switch to it
6. Switch accounts inside MetaMask
   The displayed wallet address and role detection should update immediately
7. Switch chains inside MetaMask
   The app should update network status immediately and block writes on the wrong chain
8. Refresh the page
   The app should restore the account/chain session without auto-prompting a new connection request
9. Reject the connect prompt or network switch prompt
   The UI should show a readable error state and stay usable

## Local Run Against The Live Testnet

If you want to run the frontend locally against the same deployed contracts:

```bash
npm run frontend:dev
```

## Notes

- The frontend is connected to live deployed testnet contracts, not placeholders
- Vercel deploys only the frontend, not the Solidity contracts
- If you redeploy Escrowiva or TestToken later, update both Vercel env vars and [frontend/.env.local](c:\Users\HP\Desktop\Escrowiva\frontend\.env.local)
