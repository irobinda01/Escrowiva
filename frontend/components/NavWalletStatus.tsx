"use client";

import { useEffect, useState } from "react";
import { formatAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";

export function NavWalletStatus() {
  const {
    account,
    connect,
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

  const showInstall = hydrated && !isMetaMaskInstalled;
  const showConnect = hydrated && isMetaMaskInstalled && !isConnected;
  const showSwitch = hydrated && isConnected && !isCorrectNetwork;
  const showDisconnect = hydrated && isConnected;

  return (
    <div className="nav-wallet">
      <div className="nav-wallet-copy">
        <span className="nav-wallet-label">Wallet session</span>
        <div className="nav-wallet-row">
          <span className={`badge ${hydrated && isConnected ? "status" : "status-soft"}`}>
            <span className="badge-dot" />
            {hydrated ? (isConnected ? "Connected" : "Disconnected") : "Checking"}
          </span>
          <span className="pill mono nav-wallet-address">
            {hydrated ? (account ? formatAddress(account) : "No wallet connected") : "Restoring session"}
          </span>
          {hydrated && isConnected ? (
            <span className={`badge ${isCorrectNetwork ? "status" : "status-danger"}`}>
              {isCorrectNetwork ? requiredChain.chainName : "Wrong network"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="nav-wallet-actions">
        {showInstall ? (
          <a className="ghost" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
            Install MetaMask
          </a>
        ) : null}
        {showConnect ? (
          <button className="primary" type="button" onClick={() => connect()} disabled={isBusy}>
            {status === "connecting" ? "Connecting..." : "Connect"}
          </button>
        ) : null}
        {showSwitch ? (
          <button className="secondary" type="button" onClick={() => switchNetwork()} disabled={isBusy}>
            {status === "switching" ? "Switching..." : "Switch Network"}
          </button>
        ) : null}
        {showDisconnect ? (
          <button className="ghost" type="button" onClick={() => resetWallet()} disabled={isBusy}>
            Disconnect
          </button>
        ) : null}
      </div>
    </div>
  );
}
