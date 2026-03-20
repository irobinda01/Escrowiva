"use client";

import { useWallet } from "../lib/wallet";

export function WalletBanner() {
  const { error, isConnected, isCorrectNetwork, requiredChain, status, switchNetwork } = useWallet();

  if (status === "install" || status === "ready" || (!error && (!isConnected || isCorrectNetwork))) {
    return null;
  }

  return (
    <div className="card stack card-accent wallet-banner">
      {status === "wrong_network" ? (
        <>
          <div className="row">
            <span className="pill status-danger">Wrong Network</span>
            <span className="pill">{requiredChain.chainName}</span>
          </div>
          <div className="state-panel state-pending">
            <strong>Escrowiva is ready. Your wallet is just on the wrong chain.</strong>
            <span className="meta">
              Switch to {requiredChain.chainName} to enable invoice signing, escrow funding, milestone advances, and
              settlement.
            </span>
          </div>
          <div className="row">
            <button className="primary" onClick={() => switchNetwork()}>
              Switch To Required Testnet
            </button>
          </div>
        </>
      ) : error ? (
        <>
          <div className="row">
            <span className="pill status-danger">Wallet Notice</span>
          </div>
          <div className="state-panel state-error">
            <strong>MetaMask needs your attention.</strong>
            <span className="meta">{error.message}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
