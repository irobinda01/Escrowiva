"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ToastProvider } from "../lib/toast";
import { WalletProvider } from "../lib/wallet";
import { NavWalletStatus } from "./NavWalletStatus";
import { WalletBanner } from "./WalletBanner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>
        <div className="shell">
          <nav className="nav">
            <div className="nav-left">
              <Link className="nav-brand" href="/">
                <span className="nav-mark">E</span>
                <span className="nav-copy">
                  <strong>Escrowiva</strong>
                  <span>Milestone factoring on Polkadot EVM</span>
                </span>
              </Link>
            <div className="nav-links">
              <Link className="nav-link" href="/">
                Overview
              </Link>
              <Link className="nav-link" href="/invoices">
                Live Invoices
              </Link>
              <Link className="nav-link" href="/create-invoice">
                New Invoice
              </Link>
              </div>
            </div>
            <NavWalletStatus />
          </nav>
          <WalletBanner />
          {children}
        </div>
      </ToastProvider>
    </WalletProvider>
  );
}
