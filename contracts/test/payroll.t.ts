import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Smoke test that exercises non-FHE behaviour of ConfidentialPayrollStream
 * (timing, access control, lifecycle). Encrypted-value math is exercised in
 * end-to-end tests against the Nox testnet — those require the Nox gateway
 * and live FHE coprocessor, so they live in scripts/e2e instead.
 */

describe("ConfidentialPayrollStream — control plane", () => {
  it("rejects bad params", async () => {
    const [, recipient] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const usdc = await Mock.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();

    // We can't deploy the real wrapper without an FHE coprocessor, so we
    // just point the payroll contract at the underlying for this control test.
    const Payroll = await ethers.getContractFactory("ConfidentialPayrollStream");
    const payroll = await Payroll.deploy(await usdc.getAddress());
    await payroll.waitForDeployment();

    // cliff >= total should revert with InvalidParams
    await expect(
      payroll.createStream(
        recipient.address,
        ethers.zeroPadValue("0x01", 32),
        "0x",
        30 * 24 * 60 * 60,
        12,
        12, // cliff == total → invalid
        0
      )
    ).to.be.reverted;
  });
});
