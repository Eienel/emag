/* eslint-disable no-console */
import { ethers, network } from "hardhat";

/**
 * Stand-alone deployment of the PiggyBank "Hello World" contract.
 * Proves the deployer wallet has interacted with the iExec Nox tutorial
 * contract pattern on Arbitrum Sepolia.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`\n→ Deploying PiggyBank to chainId=${chainId} as ${deployer.address}`);
  console.log(`  balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  const PiggyBank = await ethers.getContractFactory("PiggyBank");
  const piggy = await PiggyBank.deploy();
  await piggy.waitForDeployment();
  const addr = await piggy.getAddress();

  console.log(`\n✓ PiggyBank deployed at ${addr}`);
  console.log(`  Arbiscan: https://sepolia.arbiscan.io/address/${addr}`);
  console.log(`  network:  ${network.name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
