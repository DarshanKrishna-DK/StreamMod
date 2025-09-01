// Smart contract integration service for PandaPi
import { formatEther, parseEther } from 'viem';
import { useAccount } from 'wagmi';
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from '~~/hooks/scaffold-eth';

export interface ContractUser {
  walletAddress: string;
  profileHash: string;
  totalStreams: bigint;
  totalEarnings: bigint;
  totalSpent: bigint;
  isRegistered: boolean;
  registeredAt: bigint;
}

export interface ContractStream {
  id: bigint;
  streamer: string;
  title: string;
  category: string;
  metadataHash: string;
  startTime: bigint;
  endTime: bigint;
  totalEarnings: bigint;
  peakViewers: bigint;
  isActive: boolean;
  moderatorIds: bigint[];
}

export interface ContractModerator {
  id: bigint;
  creator: string;
  moderatorType: string;
  configHash: string;
  pricePerHour: bigint;
  totalUsage: bigint;
  totalEarnings: bigint;
  isActive: boolean;
  createdAt: bigint;
}

class ContractService {
  private static instance: ContractService;

  private constructor() {}

  static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  // Register user on the blockchain
  async registerUser(profileHash: string, writeContract: any): Promise<string> {
    try {
      const tx = await writeContract({
        functionName: "registerUser",
        args: [profileHash],
      });
      
      console.log("User registration transaction:", tx);
      return tx;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  // Create stream on the blockchain
  async createStream(
    title: string,
    category: string,
    metadataHash: string,
    moderatorIds: bigint[],
    writeContract: any
  ): Promise<string> {
    try {
      const tx = await writeContract({
        functionName: "createStream",
        args: [title, category, metadataHash, moderatorIds],
      });
      
      console.log("Stream creation transaction:", tx);
      return tx;
    } catch (error) {
      console.error("Error creating stream:", error);
      throw error;
    }
  }

  // End stream on the blockchain
  async endStream(
    streamId: bigint,
    peakViewers: bigint,
    writeContract: any
  ): Promise<string> {
    try {
      const tx = await writeContract({
        functionName: "endStream",
        args: [streamId, peakViewers],
      });
      
      console.log("Stream end transaction:", tx);
      return tx;
    } catch (error) {
      console.error("Error ending stream:", error);
      throw error;
    }
  }

  // Create moderator on the blockchain
  async createModerator(
    moderatorType: string,
    configHash: string,
    pricePerHour: bigint,
    writeContract: any
  ): Promise<string> {
    try {
      const tx = await writeContract({
        functionName: "createModerator",
        args: [moderatorType, configHash, pricePerHour],
      });
      
      console.log("Moderator creation transaction:", tx);
      return tx;
    } catch (error) {
      console.error("Error creating moderator:", error);
      throw error;
    }
  }

  // Pay for moderator usage
  async payModeratorUsage(
    usageId: bigint,
    cost: bigint,
    writeContract: any
  ): Promise<string> {
    try {
      const tx = await writeContract({
        functionName: "payModeratorUsage",
        args: [usageId],
        value: cost,
      });
      
      console.log("Moderator payment transaction:", tx);
      return tx;
    } catch (error) {
      console.error("Error paying for moderator usage:", error);
      throw error;
    }
  }

  // Withdraw earnings
  async withdrawEarnings(writeContract: any): Promise<string> {
    try {
      const tx = await writeContract({
        functionName: "withdrawEarnings",
        args: [],
      });
      
      console.log("Withdrawal transaction:", tx);
      return tx;
    } catch (error) {
      console.error("Error withdrawing earnings:", error);
      throw error;
    }
  }

  // Helper function to convert wei to AVAX
  weiToAvax(wei: bigint): string {
    return formatEther(wei);
  }

  // Helper function to convert AVAX to wei
  avaxToWei(avax: string): bigint {
    return parseEther(avax);
  }

  // Helper function to upload data to IPFS (placeholder)
  async uploadToIPFS(data: any): Promise<string> {
    // In production, this would upload to IPFS
    // For now, we'll return a mock hash
    const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    console.log("Mock IPFS upload:", data, "->", mockHash);
    return mockHash;
  }

  // Helper function to fetch data from IPFS (placeholder)
  async fetchFromIPFS(hash: string): Promise<any> {
    // In production, this would fetch from IPFS
    // For now, we'll return mock data
    console.log("Mock IPFS fetch:", hash);
    return {
      hash,
      data: "Mock IPFS data",
      timestamp: Date.now()
    };
  }
}

// React hooks for contract interaction
export function useContractService() {
  const { address } = useAccount();
  
  const { data: contract } = useScaffoldContract({
    contractName: "PandaPiStreaming",
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PandaPiStreaming",
  });

  // Read user data
  const { data: userData } = useScaffoldReadContract({
    contractName: "PandaPiStreaming",
    functionName: "getUser",
    args: [address],
  });

  // Read user balance
  const { data: userBalance } = useScaffoldReadContract({
    contractName: "PandaPiStreaming",
    functionName: "getUserBalance",
    args: [address],
  });

  const contractService = ContractService.getInstance();

  return {
    contract,
    contractService,
    writeContract: writeContractAsync,
    userData: userData as ContractUser | undefined,
    userBalance: userBalance as bigint | undefined,
    
    // Convenience methods
    registerUser: (profileHash: string) => 
      contractService.registerUser(profileHash, writeContractAsync),
    
    createStream: (title: string, category: string, metadataHash: string, moderatorIds: bigint[]) =>
      contractService.createStream(title, category, metadataHash, moderatorIds, writeContractAsync),
    
    endStream: (streamId: bigint, peakViewers: bigint) =>
      contractService.endStream(streamId, peakViewers, writeContractAsync),
    
    createModerator: (moderatorType: string, configHash: string, pricePerHour: bigint) =>
      contractService.createModerator(moderatorType, configHash, pricePerHour, writeContractAsync),
    
    payModeratorUsage: (usageId: bigint, cost: bigint) =>
      contractService.payModeratorUsage(usageId, cost, writeContractAsync),
    
    withdrawEarnings: () =>
      contractService.withdrawEarnings(writeContractAsync),
  };
}

export default ContractService;
