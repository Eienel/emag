/* eslint-disable no-console */
/**
 * Seed an end-to-end demo: mint mUSDC to two test accounts, wrap into wcUSDC,
 * and create a couple of streams so a fresh deployment has something to look
 * at in the UI.
 *
 * Usage:
 *   DEMO_RECIPIENT=0xRECIPIENT npm --prefix contracts run seed
 */
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsPath = path.resolve(__dirname, `../deployments.${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployments file at ${deploymentsPath} — run \`deploy\` first.`);
  }
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const [employer] = await ethers.getSigners();
  const recipient = process.env.DEMO_RECIPIENT;
  if (!recipient) throw new Error("set DEMO_RECIPIENT=0x… (a second wallet you control)");

  console.log(`employer:  ${employer.address}`);
  console.log(`recipient: ${recipient}`);

  const usdc = await ethers.getContractAt("MockERC20", deployments.contracts.underlying);
  const wrapper = await ethers.getContractAt("WrappedConfidentialUSDC", deployments.contracts.wrappedConfidentialUSDC);

  // Mint 60k mUSDC, approve wrapper, and wrap.
  const amount = 60_000n * 10n ** 6n;
  console.log("→ minting mUSDC to employer…");
  await (await usdc.mint(employer.address, amount)).wait();
  console.log("→ approving wrapper…");
  await (await usdc.approve(deployments.contracts.wrappedConfidentialUSDC, amount)).wait();
  console.log("→ wrapping mUSDC → wcUSDC…");
  await (await wrapper.wrap(employer.address, amount)).wait();

  console.log("\n✓ seed complete. Open the employer page in the UI to create the demo streams.");
}

main().catch((e) => { console.error(e); process.exit(1); });
