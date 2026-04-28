/* eslint-disable no-console */
import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Known USDC addresses we may want to wrap. Override via DEMO_UNDERLYING_ADDRESS.
const KNOWN_USDC: Record<number, string> = {
  // Arbitrum Sepolia: Circle's testnet USDC (verify before relying on this).
  421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`\n→ Deploying ShadowPay to chainId=${chainId} as ${deployer.address}`);
  console.log(`  balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // 1. Underlying ERC-20 (real USDC on Arbitrum Sepolia, or a freshly-minted MockERC20 elsewhere)
  let underlyingAddress = process.env.DEMO_UNDERLYING_ADDRESS ?? KNOWN_USDC[chainId];
  if (!underlyingAddress) {
    console.log("  no underlying configured — deploying MockERC20 (mUSDC)");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mock = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await mock.waitForDeployment();
    underlyingAddress = await mock.getAddress();
    console.log(`  ✓ MockERC20 (mUSDC) → ${underlyingAddress}`);

    // Seed the deployer with 1M mUSDC for the demo.
    const seed = 1_000_000n * 10n ** 6n;
    await (await mock.mint(deployer.address, seed)).wait();
    console.log(`  ✓ minted ${seed} mUSDC to deployer`);
  } else {
    console.log(`  using existing underlying ERC-20 at ${underlyingAddress}`);
  }

  // 2. Confidential wrapper (wcUSDC)
  const Wrapper = await ethers.getContractFactory("WrappedConfidentialUSDC");
  const wrapper = await Wrapper.deploy(underlyingAddress);
  await wrapper.waitForDeployment();
  const wrapperAddress = await wrapper.getAddress();
  console.log(`  ✓ WrappedConfidentialUSDC (wcUSDC) → ${wrapperAddress}`);

  // 3. Payroll streaming contract
  const Payroll = await ethers.getContractFactory("ConfidentialPayrollStream");
  const payroll = await Payroll.deploy(wrapperAddress);
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log(`  ✓ ConfidentialPayrollStream → ${payrollAddress}`);

  // 4. Persist deployment artifact
  const out = {
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      underlying: underlyingAddress,
      wrappedConfidentialUSDC: wrapperAddress,
      confidentialPayrollStream: payrollAddress,
    },
  };
  const outPath = path.resolve(__dirname, `../deployments.${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n✓ wrote ${outPath}`);

  // Mirror to the web app so the frontend picks it up automatically.
  const webOutPath = path.resolve(__dirname, "../../web/lib/deployments.json");
  fs.writeFileSync(webOutPath, JSON.stringify(out, null, 2));
  console.log(`✓ mirrored to ${webOutPath}`);

  // 5. Verify on Arbiscan when an API key is set
  if (process.env.ARBISCAN_API_KEY && chainId === 421614) {
    console.log("\n→ verifying contracts on Arbiscan…");
    try {
      await run("verify:verify", { address: wrapperAddress, constructorArguments: [underlyingAddress] });
    } catch (e) { console.warn("wcUSDC verify failed:", (e as Error).message); }
    try {
      await run("verify:verify", { address: payrollAddress, constructorArguments: [wrapperAddress] });
    } catch (e) { console.warn("payroll verify failed:", (e as Error).message); }
  }

  console.log("\n✓ done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
