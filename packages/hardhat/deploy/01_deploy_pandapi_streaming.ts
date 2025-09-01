import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the PandaPiStreaming contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployPandaPiStreaming: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy the contract with the deployer as the initial fee recipient
  await deploy("PandaPiStreaming", {
    from: deployer,
    // Contract constructor arguments
    args: [deployer], // feeRecipient address
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const pandaPiStreaming = await hre.ethers.getContract<Contract>("PandaPiStreaming", deployer);
  console.log("👋 PandaPiStreaming deployed to:", await pandaPiStreaming.getAddress());
  console.log("🎯 Fee recipient set to:", deployer);
  console.log("💰 Platform fee:", await pandaPiStreaming.platformFeePercentage(), "basis points (2.5%)");
};

export default deployPandaPiStreaming;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags PandaPiStreaming
deployPandaPiStreaming.tags = ["PandaPiStreaming"];
