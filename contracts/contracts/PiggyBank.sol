// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title PiggyBank
/// @notice Hello-World iExec Nox contract. Holds an encrypted balance per
///         depositor and supports encrypted deposits / withdrawals.
contract PiggyBank {
    mapping(address => euint256) private _balances;

    constructor() {
        // Initialise an encrypted zero so the slot is well-defined.
        euint256 zero = Nox.toEuint256(0);
        Nox.allowThis(zero);
        _balances[msg.sender] = zero;
    }

    /// @notice Deposit an encrypted amount into the caller's piggy bank.
    function deposit(externalEuint256 inputHandle, bytes calldata inputProof) external {
        euint256 amount = Nox.fromExternal(inputHandle, inputProof);
        euint256 current = _balances[msg.sender];
        // First-time depositors start at zero.
        if (!Nox.isInitialized(current)) {
            current = Nox.toEuint256(0);
        }
        euint256 next = Nox.add(current, amount);
        Nox.allowThis(next);
        Nox.allow(next, msg.sender);
        _balances[msg.sender] = next;
    }

    /// @notice Withdraw an encrypted amount from the caller's piggy bank.
    ///         No revert on overflow — Nox.sub clamps at zero by design.
    function withdraw(externalEuint256 inputHandle, bytes calldata inputProof) external {
        euint256 amount = Nox.fromExternal(inputHandle, inputProof);
        euint256 current = _balances[msg.sender];
        euint256 next = Nox.sub(current, amount);
        Nox.allowThis(next);
        Nox.allow(next, msg.sender);
        _balances[msg.sender] = next;
    }

    /// @notice Read the caller's encrypted balance handle.
    function balanceOf(address who) external view returns (euint256) {
        return _balances[who];
    }
}
