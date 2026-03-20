"use client";

import {
  BrowserProvider,
  Contract,
  JsonRpcSigner
} from "ethers";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { erc20Abi, escrowivaAbi } from "./abi";
import {
  BLOCK_EXPLORER_URL,
  CHAIN_CONFIG,
  CONTRACT_ADDRESS,
  RPC_URL,
  TOKEN_ADDRESS
} from "./constants";

type RequestArguments = {
  method: string;
  params?: unknown[] | object;
};

type EthereumProvider = {
  isMetaMask?: boolean;
  request: (args: RequestArguments) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

type WalletErrorKind =
  | "missing_provider"
  | "request_pending"
  | "rejected"
  | "wrong_network"
  | "unsupported_method"
  | "provider_failure"
  | "unknown";

type WalletStatus =
  | "idle"
  | "checking"
  | "ready"
  | "install"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "switching"
  | "error";

type WalletError = {
  kind: WalletErrorKind;
  message: string;
};

type WalletContextValue = {
  account: string;
  chainIdHex: string;
  chainIdDecimal: number | null;
  status: WalletStatus;
  error: WalletError | null;
  isMetaMaskInstalled: boolean;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  isBusy: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  requiredChain: typeof CHAIN_CONFIG;
  blockExplorerUrl: string;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  resetWallet: () => Promise<void>;
  getSignerContractBundle: () => {
    provider: BrowserProvider;
    signer: JsonRpcSigner;
    contract: Contract;
    token: Contract;
  };
};

const WalletContext = createContext<WalletContextValue | null>(null);
const WALLET_SESSION_SUPPRESSED_KEY = "escrowiva_wallet_session_suppressed";

function normalizeChainIdHex(value: string) {
  return value.toLowerCase();
}

function toWalletError(error: unknown): WalletError {
  const candidate = error as { code?: number; message?: string };
  const code = candidate?.code;
  const message = candidate?.message || "Wallet request failed";

  if (code === 4001) {
    return { kind: "rejected", message: "You rejected the request in MetaMask." };
  }
  if (code === -32002) {
    return { kind: "request_pending", message: "A MetaMask request is already pending. Please finish it first." };
  }
  if (code === 4902) {
    return { kind: "wrong_network", message: "The required testnet is not added in MetaMask yet." };
  }
  if (code === 4200) {
    return { kind: "unsupported_method", message: "MetaMask does not support this network action." };
  }
  if (code === 4900 || code === 4901) {
    return { kind: "provider_failure", message: "MetaMask is disconnected from the network." };
  }
  if (message.toLowerCase().includes("metamask is not available")) {
    return { kind: "missing_provider", message: "MetaMask is not installed in this browser." };
  }

  return { kind: "unknown", message };
}

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.ethereum ?? null;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState("");
  const [chainIdHex, setChainIdHex] = useState("");
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [error, setError] = useState<WalletError | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [walletSessionSuppressed, setWalletSessionSuppressed] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const connectInFlightRef = useRef(false);
  const switchInFlightRef = useRef(false);

  const isMetaMaskInstalled = typeof window !== "undefined" && Boolean(getEthereumProvider()?.isMetaMask);
  const normalizedRequiredChain = normalizeChainIdHex(CHAIN_CONFIG.chainIdHex);
  const normalizedCurrentChain = normalizeChainIdHex(chainIdHex || "");
  const isConnected = Boolean(account);
  const isCorrectNetwork = Boolean(chainIdHex) && normalizedCurrentChain === normalizedRequiredChain;
  const chainIdDecimal = chainIdHex ? Number.parseInt(chainIdHex, 16) : null;
  const isBusy = status === "checking" || status === "connecting" || status === "switching";

  const syncSigner = useCallback(
    async (nextProvider: BrowserProvider | null, nextAccount: string, nextChainIdHex: string) => {
      if (!nextProvider || !nextAccount || normalizeChainIdHex(nextChainIdHex) !== normalizedRequiredChain) {
        setSigner(null);
        return;
      }

      const nextSigner = await nextProvider.getSigner();
      setSigner(nextSigner);
    },
    [normalizedRequiredChain]
  );

  const syncWallet = useCallback(async (force = false) => {
    const injected = getEthereumProvider();

    if (!injected) {
      setAccount("");
      setChainIdHex("");
      setProvider(null);
      setSigner(null);
      setStatus("install");
      setError({ kind: "missing_provider", message: "Install MetaMask to connect to the required testnet." });
      return;
    }

    if (walletSessionSuppressed && !force) {
      setAccount("");
      setChainIdHex("");
      setProvider(null);
      setSigner(null);
      setError(null);
      setStatus("ready");
      return;
    }

    try {
      const [accountsResult, chainIdResult] = await Promise.all([
        injected.request({ method: "eth_accounts" }),
        injected.request({ method: "eth_chainId" })
      ]);

      const nextAccounts = accountsResult as string[];
      const nextChainIdHex = chainIdResult as string;
      const nextAccount = nextAccounts[0] || "";
      const nextProvider = new BrowserProvider(injected);

      setProvider(nextProvider);
      setAccount(nextAccount);
      setChainIdHex(nextChainIdHex);
      setError(null);

      if (!nextAccount) {
        setStatus("ready");
        setSigner(null);
        return;
      }

      if (normalizeChainIdHex(nextChainIdHex) !== normalizedRequiredChain) {
        setStatus("wrong_network");
        setSigner(null);
        setError({
          kind: "wrong_network",
          message: `Switch MetaMask to ${CHAIN_CONFIG.chainName} to use Escrowiva.`
        });
        return;
      }

      await syncSigner(nextProvider, nextAccount, nextChainIdHex);
      setStatus("connected");
    } catch (syncError) {
      setStatus("error");
      setError(toWalletError(syncError));
    }
  }, [normalizedRequiredChain, syncSigner, walletSessionSuppressed]);

  const switchNetwork = useCallback(async () => {
    const injected = getEthereumProvider();

    if (!injected) {
      setStatus("install");
      setError({ kind: "missing_provider", message: "Install MetaMask to switch to the required testnet." });
      return;
    }

    if (switchInFlightRef.current) {
      return;
    }

    switchInFlightRef.current = true;
    setStatus("switching");
    setError(null);

    try {
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_CONFIG.chainIdHex }]
      });
    } catch (switchError) {
      const parsed = switchError as { code?: number };

      if (parsed?.code === 4902) {
        await injected.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN_CONFIG.chainIdHex,
              chainName: CHAIN_CONFIG.chainName,
              nativeCurrency: CHAIN_CONFIG.nativeCurrency,
              rpcUrls: CHAIN_CONFIG.rpcUrls,
              blockExplorerUrls: CHAIN_CONFIG.blockExplorerUrls
            }
          ]
        });

        await injected.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_CONFIG.chainIdHex }]
        });
      } else {
        throw switchError;
      }
    } finally {
      switchInFlightRef.current = false;
    }

    await syncWallet(true);
  }, [syncWallet]);

  const connect = useCallback(async () => {
    const injected = getEthereumProvider();

    if (!injected) {
      setStatus("install");
      setError({ kind: "missing_provider", message: "Install MetaMask to connect your wallet." });
      return;
    }

    if (connectInFlightRef.current) {
      return;
    }

    connectInFlightRef.current = true;
    setStatus("connecting");
    setError(null);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(WALLET_SESSION_SUPPRESSED_KEY);
      }
      setWalletSessionSuppressed(false);
      await injected.request({ method: "eth_requestAccounts" });

      const currentChain = await injected.request({ method: "eth_chainId" });
      if (normalizeChainIdHex(currentChain as string) !== normalizedRequiredChain) {
        await switchNetwork();
      } else {
        await syncWallet(true);
      }
    } catch (connectError) {
      setStatus("error");
      setError(toWalletError(connectError));
    } finally {
      connectInFlightRef.current = false;
    }
  }, [normalizedRequiredChain, switchNetwork, syncWallet]);

  const resetWallet = useCallback(async () => {
    // MetaMask does not expose a true programmatic disconnect for injected dapps.
    // We suppress auto-restore until the user explicitly reconnects.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WALLET_SESSION_SUPPRESSED_KEY, "true");
    }
    setWalletSessionSuppressed(true);
    setAccount("");
    setChainIdHex("");
    setProvider(null);
    setSigner(null);
    setError(null);
    setStatus(isMetaMaskInstalled ? "ready" : "install");
  }, [isMetaMaskInstalled, syncWallet]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWalletSessionSuppressed(window.localStorage.getItem(WALLET_SESSION_SUPPRESSED_KEY) === "true");
    }
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    syncWallet().catch(() => undefined);
  }, [preferencesReady, syncWallet]);

  useEffect(() => {
    const injected = getEthereumProvider();

    if (!injected) {
      return;
    }

    const handleAccountsChanged = (nextAccounts: unknown) => {
      if (walletSessionSuppressed) {
        return;
      }

      const accounts = (nextAccounts as string[]) || [];
      const nextAccount = accounts[0] || "";
      setAccount(nextAccount);
      setError(null);

      if (!nextAccount) {
        setSigner(null);
        setStatus("ready");
        return;
      }

      if (normalizeChainIdHex(chainIdHex || "") !== normalizedRequiredChain) {
        setStatus("wrong_network");
        return;
      }

      syncWallet().catch(() => undefined);
    };

    const handleChainChanged = (nextChainId: unknown) => {
      if (walletSessionSuppressed) {
        return;
      }

      const nextHex = String(nextChainId);
      setChainIdHex(nextHex);
      setError(null);

      if (normalizeChainIdHex(nextHex) !== normalizedRequiredChain) {
        setSigner(null);
        setStatus("wrong_network");
        return;
      }

      syncWallet().catch(() => undefined);
    };

    const handleDisconnect = () => {
      if (walletSessionSuppressed) {
        return;
      }

      setAccount("");
      setSigner(null);
      setStatus("ready");
      setError({
        kind: "provider_failure",
        message: "MetaMask disconnected. Reconnect to continue."
      });
    };

    injected.on("accountsChanged", handleAccountsChanged);
    injected.on("chainChanged", handleChainChanged);
    injected.on("disconnect", handleDisconnect);

    return () => {
      injected.removeListener("accountsChanged", handleAccountsChanged);
      injected.removeListener("chainChanged", handleChainChanged);
      injected.removeListener("disconnect", handleDisconnect);
    };
  }, [chainIdHex, normalizedRequiredChain, syncWallet, walletSessionSuppressed]);

  const getSignerContractBundle = useCallback(() => {
    if (!provider || !signer || !account) {
      throw new Error("Connect your wallet to continue.");
    }
    if (!isCorrectNetwork) {
      throw new Error(`Switch MetaMask to ${CHAIN_CONFIG.chainName} before sending transactions.`);
    }
    if (!CONTRACT_ADDRESS || !TOKEN_ADDRESS || !RPC_URL) {
      throw new Error("Frontend contract or network configuration is incomplete.");
    }

    return {
      provider,
      signer,
      contract: new Contract(CONTRACT_ADDRESS, escrowivaAbi, signer),
      token: new Contract(TOKEN_ADDRESS, erc20Abi, signer)
    };
  }, [account, isCorrectNetwork, provider, signer]);

  const value = useMemo<WalletContextValue>(
    () => ({
      account,
      chainIdHex,
      chainIdDecimal,
      status,
      error,
      isMetaMaskInstalled,
      isConnected,
      isCorrectNetwork,
      isBusy,
      provider,
      signer,
      requiredChain: CHAIN_CONFIG,
      blockExplorerUrl: BLOCK_EXPLORER_URL,
      connect,
      switchNetwork,
      resetWallet,
      getSignerContractBundle
    }),
    [
      account,
      chainIdDecimal,
      chainIdHex,
      connect,
      error,
      getSignerContractBundle,
      isBusy,
      isConnected,
      isCorrectNetwork,
      isMetaMaskInstalled,
      provider,
      BLOCK_EXPLORER_URL,
      resetWallet,
      signer,
      status,
      switchNetwork
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider.");
  }
  return context;
}
