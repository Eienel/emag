// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";

/// @title ConfidentialPayrollStream
/// @notice Period-chunked confidential payroll streams powered by ERC-7984 confidential tokens.
/// @dev    Each stream stores a single encrypted `amountPerPeriod`; the public schedule is
///         derived from `startTime`, `periodSeconds`, `totalPeriods`, `cliffPeriods`. Payouts
///         compute `amountPerPeriod * encryptedPeriods` (FHE mul of an encrypted value by a
///         trivially-encrypted public scalar) and call `confidentialTransfer` on the wrapped
///         token. Auditors can be granted ACL access per stream for selective disclosure.
contract ConfidentialPayrollStream is Ownable, ReentrancyGuard {
    /// @dev Confidential ERC-20 wrapper this contract pays out (e.g. wcUSDC).
    IERC7984 public immutable confidentialToken;

    struct Stream {
        address payer;
        address recipient;
        uint64  startTime;
        uint64  periodSeconds;     // length of one chunk
        uint64  totalPeriods;      // number of chunks in the stream
        uint64  cliffPeriods;      // chunks skipped before the first claim is allowed
        uint64  claimedPeriods;    // how many chunks the recipient has already pulled
        bool    cancelled;
        euint256 amountPerPeriod;  // encrypted per-period payout
    }

    uint256 public nextStreamId;
    mapping(uint256 => Stream) private _streams;

    /// @dev streamId => auditor => allowed
    mapping(uint256 => mapping(address => bool)) public auditors;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed payer,
        address indexed recipient,
        uint64 startTime,
        uint64 periodSeconds,
        uint64 totalPeriods,
        uint64 cliffPeriods
    );
    event StreamClaimed(uint256 indexed streamId, address indexed recipient, uint64 periodsClaimed);
    event StreamCancelled(uint256 indexed streamId, uint64 periodsForfeited);
    event AuditorGranted(uint256 indexed streamId, address indexed auditor);
    event AuditorRevoked(uint256 indexed streamId, address indexed auditor);

    error NotPayer();
    error NotRecipient();
    error InvalidParams();
    error StreamCancelledError();
    error NothingToClaim();

    constructor(IERC7984 confidentialToken_) Ownable(msg.sender) {
        confidentialToken = confidentialToken_;
    }

    // ---------------------------------------------------------------------
    // Stream lifecycle
    // ---------------------------------------------------------------------

    /// @notice Create a new payroll stream. Pulls `amountPerPeriod * totalPeriods` of confidential
    ///         tokens from the caller into this contract, where they remain locked until the
    ///         recipient claims them or the stream is cancelled.
    /// @param recipient        wallet that will pull the periodic payouts
    /// @param encryptedAmount  encrypted per-period payout (externalEuint256 from the FHE coprocessor)
    /// @param inputProof       FHE input proof bound to the encrypted amount
    /// @param periodSeconds    length of one period (e.g. 30 days)
    /// @param totalPeriods     total number of periods in the stream
    /// @param cliffPeriods     periods to skip before the first claim is allowed
    /// @param startTime        unix timestamp the stream begins (0 = now)
    /// @dev The caller must have first called `setOperator(address(this), …)` on the
    ///      confidential token so this contract can `confidentialTransferFrom` the locked amount.
    function createStream(
        address recipient,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof,
        uint64 periodSeconds,
        uint64 totalPeriods,
        uint64 cliffPeriods,
        uint64 startTime
    ) external nonReentrant returns (uint256 streamId) {
        if (recipient == address(0) || periodSeconds == 0 || totalPeriods == 0 || cliffPeriods >= totalPeriods) {
            revert InvalidParams();
        }

        // 1. Ingest encrypted per-period amount.
        euint256 amountPerPeriod = Nox.fromExternal(encryptedAmount, inputProof);

        // 2. Compute total to lock (encrypted × encrypted-public-scalar).
        euint256 totalLocked = Nox.mul(amountPerPeriod, Nox.toEuint256(uint256(totalPeriods)));

        // 3. Pull funds from payer into this contract.
        Nox.allowTransient(totalLocked, address(confidentialToken));
        confidentialToken.confidentialTransferFrom(msg.sender, address(this), totalLocked);

        // 4. Persist the stream.
        streamId = nextStreamId++;
        _streams[streamId] = Stream({
            payer: msg.sender,
            recipient: recipient,
            startTime: startTime == 0 ? uint64(block.timestamp) : startTime,
            periodSeconds: periodSeconds,
            totalPeriods: totalPeriods,
            cliffPeriods: cliffPeriods,
            claimedPeriods: 0,
            cancelled: false,
            amountPerPeriod: amountPerPeriod
        });

        // 5. ACL: payer, recipient, and this contract can decrypt the per-period handle.
        Nox.allow(amountPerPeriod, msg.sender);
        Nox.allow(amountPerPeriod, recipient);
        Nox.allowThis(amountPerPeriod);

        emit StreamCreated(
            streamId,
            msg.sender,
            recipient,
            _streams[streamId].startTime,
            periodSeconds,
            totalPeriods,
            cliffPeriods
        );
    }

    /// @notice Claim every period that has fully vested since the last claim.
    /// @return periodsPaid number of periods this call covered
    function claim(uint256 streamId) external nonReentrant returns (uint64 periodsPaid) {
        Stream storage s = _streams[streamId];
        if (s.recipient != msg.sender) revert NotRecipient();
        if (s.cancelled) revert StreamCancelledError();

        uint64 vested = _vestedPeriods(s);
        if (vested <= s.claimedPeriods) revert NothingToClaim();

        periodsPaid = vested - s.claimedPeriods;
        s.claimedPeriods = vested;

        euint256 payout = Nox.mul(s.amountPerPeriod, Nox.toEuint256(uint256(periodsPaid)));
        Nox.allowTransient(payout, address(confidentialToken));
        confidentialToken.confidentialTransfer(s.recipient, payout);

        emit StreamClaimed(streamId, s.recipient, periodsPaid);
    }

    /// @notice Cancel a stream. Already-vested periods stay claimable by the recipient;
    ///         remaining (un-vested) periods are returned to the payer immediately.
    function cancel(uint256 streamId) external nonReentrant {
        Stream storage s = _streams[streamId];
        if (s.payer != msg.sender) revert NotPayer();
        if (s.cancelled) revert StreamCancelledError();

        uint64 vested = _vestedPeriods(s);
        uint64 forfeited = s.totalPeriods - vested;
        s.cancelled = true;
        s.totalPeriods = vested; // freeze the schedule at the current vested point

        if (forfeited > 0) {
            euint256 refund = Nox.mul(s.amountPerPeriod, Nox.toEuint256(uint256(forfeited)));
            Nox.allowTransient(refund, address(confidentialToken));
            confidentialToken.confidentialTransfer(s.payer, refund);
        }

        emit StreamCancelled(streamId, forfeited);
    }

    // ---------------------------------------------------------------------
    // Auditor / selective disclosure
    // ---------------------------------------------------------------------

    function grantAuditor(uint256 streamId, address auditor) external {
        Stream storage s = _streams[streamId];
        if (msg.sender != s.payer && msg.sender != s.recipient) revert NotPayer();
        auditors[streamId][auditor] = true;
        Nox.allow(s.amountPerPeriod, auditor);
        emit AuditorGranted(streamId, auditor);
    }

    function revokeAuditor(uint256 streamId, address auditor) external {
        Stream storage s = _streams[streamId];
        if (msg.sender != s.payer && msg.sender != s.recipient) revert NotPayer();
        auditors[streamId][auditor] = false;
        emit AuditorRevoked(streamId, auditor);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getStream(uint256 streamId)
        external
        view
        returns (
            address payer,
            address recipient,
            uint64 startTime,
            uint64 periodSeconds,
            uint64 totalPeriods,
            uint64 cliffPeriods,
            uint64 claimedPeriods,
            bool cancelled,
            euint256 amountPerPeriod
        )
    {
        Stream storage s = _streams[streamId];
        return (
            s.payer,
            s.recipient,
            s.startTime,
            s.periodSeconds,
            s.totalPeriods,
            s.cliffPeriods,
            s.claimedPeriods,
            s.cancelled,
            s.amountPerPeriod
        );
    }

    function vestedPeriods(uint256 streamId) external view returns (uint64) {
        return _vestedPeriods(_streams[streamId]);
    }

    function claimablePeriods(uint256 streamId) external view returns (uint64) {
        Stream storage s = _streams[streamId];
        uint64 v = _vestedPeriods(s);
        return v > s.claimedPeriods ? v - s.claimedPeriods : 0;
    }

    function _vestedPeriods(Stream storage s) internal view returns (uint64) {
        if (block.timestamp <= s.startTime) return 0;
        uint256 elapsed = block.timestamp - s.startTime;
        uint256 periods = elapsed / s.periodSeconds;
        if (periods <= s.cliffPeriods) return 0;
        if (periods > s.totalPeriods) periods = s.totalPeriods;
        return uint64(periods);
    }
}
