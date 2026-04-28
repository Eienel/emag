// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";

/// @notice Confidential ERC-20 wrapper for a payroll stablecoin (USDC by default).
///         Holders wrap public USDC into an encrypted balance, then transfer it
///         confidentially through ShadowPay streams. Unwrap is async (request +
///         finalize) to honour the FHE decryption flow.
contract WrappedConfidentialUSDC is ERC20ToERC7984Wrapper {
    constructor(IERC20 underlying)
        ERC20ToERC7984Wrapper(underlying)
        ERC7984("Wrapped Confidential USDC", "wcUSDC", "")
    {}
}
