import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import { task } from "hardhat/config";
import generateTsAbis from "./scripts/generateTsAbis";

// If not set, it uses a default Avalanche RPC endpoint.
// You can get your own API key from Alchemy, Infura, or use public endpoints
const providerApiKey = process.env.AVALANCHE_API_KEY || "";
// If not set, it uses the hardhat account 0 private key.
// You can generate a random account with `yarn generate` or `yarn account:import` to import your existing PK
const deployerPrivateKey =
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "localhost",
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhat: {
      forking: {
        url: `https://api.avax.network/ext/bc/C/rpc`,
        enabled: process.env.MAINNET_FORKING_ENABLED === "true",
      },
    },
    avalanche: {
      url: providerApiKey
        ? `https://avalanche-mainnet.g.alchemy.com/v2/${providerApiKey}`
        : "https://api.avax.network/ext/bc/C/rpc",
      accounts: [deployerPrivateKey],
      chainId: 43114,
      gasPrice: 25000000000, // 25 gwei
    },
    fuji: {
      url: providerApiKey
        ? `https://avalanche-fuji.g.alchemy.com/v2/${providerApiKey}`
        : "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [deployerPrivateKey],
      chainId: 43113,
      gasPrice: 25000000000, // 25 gwei
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [deployerPrivateKey],
    },
  },
  // Configuration for hardhat-verify plugin (uses built-in Avalanche support)
  etherscan: {
    apiKey: "abc", // Dummy key - Avalanche networks don't require API keys for verification
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io/",
        },
      },
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

// Extend the deploy task
task("deploy").setAction(async (args, hre, runSuper) => {
  // Run the original deploy task
  await runSuper(args);
  // Force run the generateTsAbis script
  await generateTsAbis(hre);
});

export default config;
