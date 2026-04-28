/* eslint-disable no-console */
/**
 * Seed an end-to-end demo:
 *   1. mint mUSDC to the deployer (if missing)
 *   2. wrap into wcUSDC (so the employer holds confidential balance)
 *   3. authorise the payroll contract as a confidential operator
 *
 * NOTE: actually creating a stream requires off-chain FHE encryption via the
 * Nox handle SDK; that's done from the frontend at demo time, not here.
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
  if (!recipient) {
    console.warn("DEMO_RECIPIENT not set — wrapping for the employer only.");
  } else {
    console.log(`recipient: ${recipient}`);
  }

  console.log(`employer:  ${employer.address}`);
  console.log(`network:   ${network.name}\n`);

  const usdc = await ethers.getContractAt("MockERC20", deployments.contracts.underlying);
  const wrapper = await ethers.getContractAt("WrappedConfidentialUSDC", deployments.contracts.wrappedConfidentialUSDC);
  const payroll = deployments.contracts.confidentialPayrollStream as `0x${string}`;

  // Make sure the employer has plenty of mUSDC (mint is open on the mock).
  const targetBalance = 200_000n * 10n ** 6n;
  const current = (await usdc.balanceOf(employer.address)) as bigint;
  if (current < targetBalance) {
    const need = targetBalance - current;
    console.log(`→ minting ${need} mUSDC to employer (current ${current})…`);
    await (await usdc.mint(employer.address, need)).wait();
  } else {
    console.log(`✓ employer mUSDC balance already ≥ target (${current})`);
  }

  // Approve & wrap into wcUSDC so the employer can pay confidentially.
  const wrapAmount = 100_000n * 10n ** 6n;
  console.log(`→ approving ${wrapAmount} mUSDC for the wrapper…`);
  await (await usdc.approve(deployments.contracts.wrappedConfidentialUSDC, wrapAmount)).wait();
  console.log(`→ wrapping ${wrapAmount} mUSDC → wcUSDC…`);
  await (await wrapper.wrap(employer.address, wrapAmount)).wait();

  // Pre-authorise the payroll contract as a confidential operator for ~1 year.
  // This means the employer doesn't have to do it from the UI before each
  // stream creation — the demo flow is one click.
  const oneYear = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  console.log(`→ setOperator(payroll, ${oneYear}) on wcUSDC…`);
  await (await wrapper.setOperator(payroll, oneYear)).wait();

  console.log("\n✓ seed complete.");
  console.log("Next: open the employer page in the UI to create the demo stream(s).");
  console.log(`Tip: set 'Period' to 'Hourly (demo)' in the form so 'Claim' is testable on video.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
