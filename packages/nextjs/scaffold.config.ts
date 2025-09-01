import * as chains from "viem/chains";



export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey?: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId?: string;
  onlyLocalBurnerWallet: boolean;
};

export type ScaffoldConfig = BaseConfig ;

export const DEFAULT_ALCHEMY_API_KEY = "";

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [
    chains.avalanche, // Avalanche C-Chain Mainnet
    chains.avalancheFuji // Avalanche Fuji Testnet
  ],
  // The interval at which your front-end polls the RPC servers for new data
  pollingInterval: 4000, // Faster polling for real-time streaming
  // Avalanche API key for RPC endpoints
  // Get your own from: https://www.alchemy.com/avalanche or https://infura.io/
  alchemyApiKey: process.env.NEXT_PUBLIC_AVALANCHE_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  // Production-ready RPC endpoints for Avalanche
  rpcOverrides: {
    // Avalanche C-Chain Mainnet - Production
    [chains.avalanche.id]: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    // Avalanche Fuji Testnet - Development/Testing
    [chains.avalancheFuji.id]: process.env.NEXT_PUBLIC_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
  },
  // WalletConnect Project ID for production (optional)
  // Get your own at: https://cloud.walletconnect.com
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  // Set to false for production to enable all wallet types
  onlyLocalBurnerWallet: false
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;