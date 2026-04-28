// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Nox, euint256, externalEuint256, ebool} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/IERC7984.sol";

/// @title ConfidentialPayrollStream
/// @notice Period-chunked confidential payroll streams powered by ERC-7984 confidential tokens.
/// @dev    Stream totals stay encrypted on-chain. Time math is public, so each period unlocks
///         exactly `amountPerPeriod` (encrypted) tokens. The recipient pulls funds by claiming
///         the next vested chunk(s); the contract calls `confidentialTransfer` on the wrapped
///         token. Optional auditors can be granted read access to the encrypted handle so they
///         can decrypt off-chain through the Nox gateway.
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

    /// @notice Create a new payroll stream.
    /// @param recipient        wallet that will pull the periodic payouts
    /// @param encryptedAmount  encrypted per-period payout, supplied by the payer
    /// @param inputProof       FHE input proof bound to the encrypted amount
    /// @param periodSeconds    length of one period (e.g. 30 days)
    /// @param totalPeriods     total number of periods in the stream
    /// @param cliffPeriods     periods to skip before the first claim is allowed
    /// @param startTime        unix timestamp the stream begins (0 = now)
    /// @dev The payer must have already deposited `amountPerPeriod * totalPeriods`
    ///      worth of confidential tokens into this contract, e.g. via
    ///      `confidentialTransfer` of the wrapped token. The contract trusts the
    ///      caller to pre-fund it; anyone who underfunds simply locks themselves out.
    function createStream(
        address recipient,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof,
        uint64 periodSeconds,
        uint64 totalPeriods,
        uint64 cliffPeriods,
        uint64 startTime
    ) external returns (uint256 streamId) {
        if (recipient == address(0) || periodSeconds == 0 || totalPeriods == 0 || cliffPeriods >= totalPeriods) {
            revert InvalidParams();
        }

        euint256 amountPerPeriod = Nox.fromExternal(encryptedAmount, inputProof);

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

        // Grant payer + recipient read access on the encrypted per-period handle.
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

        // payout = amountPerPeriod * periodsPaid (mul-by-public-scalar is FHE safe).
        euint256 payout = Nox.mul(s.amountPerPeriod, uint256(periodsPaid));
        Nox.allowTransient(payout, address(confidentialToken));

        confidentialToken.confidentialTransfer(s.recipient, payout);

        emit StreamClaimed(streamId, s.recipient, periodsPaid);
    }

    /// @notice Cancel a stream. Already-vested-but-unclaimed periods stay claimable;
    ///         remaining periods are forfeited and can be swept back by the payer.
    function cancel(uint256 streamId) external nonReentrant {
        Stream storage s = _streams[streamId];
        if (s.payer != msg.sender) revert NotPayer();
        if (s.cancelled) revert StreamCancelledError();

        uint64 vested = _vestedPeriods(s);
        uint64 forfeited = s.totalPeriods - vested;
        s.cancelled = true;
        s.totalPeriods = vested; // freeze the schedule at the current vested point

        if (forfeited > 0) {
            euint256 refund = Nox.mul(s.amountPerPeriod, uint256(forfeited));
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
