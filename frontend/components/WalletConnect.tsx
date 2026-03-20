"use client";

import { useEffect, useState } from "react";
import { formatAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";

export function WalletConnect() {
  const {
    account,
    chainIdDecimal,
    connect,
    error,
    isBusy,
    isConnected,
    isCorrectNetwork,
    isMetaMaskInstalled,
    requiredChain,
    resetWallet,
    status,
    switchNetwork
  } = useWallet();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const walletReadyForClientChecks = hydrated;
  const showInstallPrompt = walletReadyForClientChecks && !isMetaMaskInstalled;
  const showConnectButton = walletReadyForClientChecks && isMetaMaskInstalled && !isConnected;
  const showSwitchButton = walletReadyForClientChecks && isMetaMaskInstalled && isConnected && !isCorrectNetwork;
  const showResetButton = walletReadyForClientChecks && isMetaMaskInstalled && isConnected;

  return (
    <div className="highlight-card stack">
      <div className="section-title">
        <h3>Wallet Access</h3>
        <span className="meta">
          Connect a funded MetaMask account to sign invoice terms, fund escrow, release milestone capital, and settle
          repayments on the live testnet.
        </span>
      </div>
      <div className="stat-strip">
        <div className="stat-chip">
          <span className="micro">Connection</span>
          <strong>{walletReadyForClientChecks ? (account ? formatAddress(account) : "Awaiting wallet") : "Checking wallet"}</strong>
        </div>
        <div className="stat-chip">
          <span className="micro">Network</span>
          <strong>
            {walletReadyForClientChecks
              ? isConnected
                ? isCorrectNetwork
                  ? requiredChain.chainName
                  : "Wrong network"
                : "Not connected"
              : "Loading"}
          </strong>
        </div>
      </div>
      <div className="row">
        <span className="pill">MetaMask</span>
        <span className="pill mono">{walletReadyForClientChecks ? (account ? formatAddress(account) : "No session") : "Syncing"}</span>
        <span className={`pill ${walletReadyForClientChecks && isConnected && isCorrectNetwork ? "status" : walletReadyForClientChecks && status === "wrong_network" ? "status-danger" : "status-soft"}`}>
          {walletReadyForClientChecks
            ? isConnected
              ? isCorrectNetwork
                ? `${requiredChain.chainName}`
                : `Wrong network (${chainIdDecimal ?? "unknown"})`
              : "Awaiting connection"
            : "Checking wallet"}
        </span>
      </div>
      <div className={`state-panel ${error ? "state-error" : isConnected && isCorrectNetwork ? "state-success" : status === "wrong_network" ? "state-pending" : "state-info"}`}>
        <strong>
          {!walletReadyForClientChecks
            ? "Preparing wallet access"
            : error
            ? "Wallet attention needed"
            : isConnected && isCorrectNetwork
              ? "Wallet ready for on-chain actions"
              : status === "wrong_network"
                ? "Switch networks to continue"
                : "Your wallet stays in control"}
        </strong>
        <span className="meta">
          {!walletReadyForClientChecks
            ? "We’re checking for MetaMask and restoring any existing session before showing wallet actions."
            : error
            ? error.message
            : isConnected && isCorrectNetwork
              ? "You can now create invoices, sign agreements, fund escrow, and complete milestone actions."
              : status === "wrong_network"
                ? `Escrowiva is configured for ${requiredChain.chainName}. Switching networks will unlock contract actions.`
                : "We only request account access when you choose to connect. Nothing is signed or spent automatically."}
        </span>
      </div>
      {showInstallPrompt ? (
        <a className="primary" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
          Install MetaMask
        </a>
      ) : null}
      {showConnectButton ? (
        <button className="primary" onClick={() => connect()} disabled={isBusy}>
          {status === "connecting" ? "Opening MetaMask..." : "Connect MetaMask"}
        </button>
      ) : null}
      {showSwitchButton ? (
        <button className="primary" onClick={() => switchNetwork()} disabled={isBusy}>
          {status === "switching" ? "Switching Network..." : `Switch To ${requiredChain.chainName}`}
        </button>
      ) : null}
      {showResetButton ? (
        <button className="ghost" onClick={() => resetWallet()} disabled={isBusy}>
          Clear App Session
        </button>
      ) : null}
    </div>
  );
}
