// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Escrowiva is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum InvoiceStatus {
        Draft,
        PartiallySigned,
        FullySigned,
        EscrowFunded,
        Active,
        Matured,
        InDispute,
        Closed,
        Cancelled
    }

    enum MilestoneStatus {
        PendingFunding,
        Funded,
        Submitted,
        Approved,
        Settled,
        Disputed
    }

    struct Invoice {
        uint256 id;
        address merchant;
        address client;
        address lp;
        address token;
        uint256 totalFaceValue;
        uint256 totalDiscountedAdvance;
        uint256 escrowDeposited;
        uint256 escrowRemaining;
        uint256 fundingDeadline;
        uint256 maturityTimestamp;
        uint256 milestoneCount;
        InvoiceStatus status;
        bool clientSigned;
        bool merchantSigned;
        bool isClosed;
        bool leftoverRefunded;
    }

    struct Milestone {
        uint256 id;
        uint256 invoiceId;
        uint256 faceValue;
        uint256 discountedAdvance;
        uint256 dueTimestamp;
        bytes32 proofHash;
        MilestoneStatus status;
        bool funded;
        bool submitted;
        bool approved;
        bool settled;
        bool disputed;
        uint256 fundedAt;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 settledAt;
    }

    struct InvoiceSummary {
        uint256 invoiceId;
        InvoiceStatus status;
        uint256 totalFaceValue;
        uint256 totalDiscountedAdvance;
        uint256 escrowDeposited;
        uint256 escrowRemaining;
        uint256 settledCount;
        uint256 disputedCount;
        uint256 approvedCount;
        uint256 fundedCount;
        int256 nextFundableMilestoneId;
        bool allTerminal;
    }

    error InvalidAddress();
    error InvalidMilestoneConfiguration();
    error InvalidInvoiceStatus();
    error Unauthorized();
    error EscrowAlreadyFunded();
    error EscrowNotFunded();
    error FundingDeadlinePassed();
    error InvalidMilestoneOrder();
    error MilestoneAlreadyFunded();
    error MilestoneNotFunded();
    error MilestoneAlreadySubmitted();
    error MilestoneNotSubmitted();
    error MilestoneAlreadyApproved();
    error SettlementNotOpen();
    error MilestoneAlreadySettled();
    error InvoiceNotTerminal();
    error AlreadyRefunded();
    error NoRefundAvailable();
    error ProofHashRequired();
    error AlreadySigned();

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        address indexed client,
        address token,
        uint256 totalFaceValue,
        uint256 totalDiscountedAdvance
    );
    event InvoiceClientSigned(uint256 indexed invoiceId, address indexed client);
    event InvoiceMerchantSigned(uint256 indexed invoiceId, address indexed merchant);
    event EscrowFunded(uint256 indexed invoiceId, address indexed client, uint256 amount);
    event MilestoneFunded(
        uint256 indexed invoiceId,
        uint256 indexed milestoneId,
        address indexed lp,
        uint256 discountedAdvance
    );
    event MilestoneSubmitted(
        uint256 indexed invoiceId,
        uint256 indexed milestoneId,
        bytes32 proofHash
    );
    event MilestoneApproved(uint256 indexed invoiceId, uint256 indexed milestoneId, address indexed client);
    event MilestoneSettled(
        uint256 indexed invoiceId,
        uint256 indexed milestoneId,
        address indexed lp,
        uint256 faceValue
    );
    event MilestoneDisputed(uint256 indexed invoiceId, uint256 indexed milestoneId);
    event InvoiceClosed(uint256 indexed invoiceId, address indexed closedBy);
    event LeftoverRefunded(uint256 indexed invoiceId, address indexed client, uint256 amount);

    uint256 private _nextInvoiceId = 1;
    mapping(uint256 => Invoice) private _invoices;
    mapping(uint256 => Milestone[]) private _milestones;

    modifier invoiceExists(uint256 invoiceId) {
        if (_invoices[invoiceId].id == 0) revert InvalidInvoiceStatus();
        _;
    }

    function createInvoice(
        address client,
        address token,
        uint256 totalFaceValue,
        uint256 fundingDeadline,
        uint256 maturityTimestamp,
        uint256[] calldata milestoneFaceValues,
        uint256[] calldata discountedAdvances,
        uint256[] calldata dueTimestamps
    ) external returns (uint256 invoiceId) {
        if (client == address(0) || token == address(0)) revert InvalidAddress();
        if (
            milestoneFaceValues.length == 0 ||
            milestoneFaceValues.length != discountedAdvances.length ||
            milestoneFaceValues.length != dueTimestamps.length
        ) revert InvalidMilestoneConfiguration();
        if (maturityTimestamp <= block.timestamp || fundingDeadline > maturityTimestamp) {
            revert InvalidMilestoneConfiguration();
        }

        uint256 totalAdvance;
        uint256 faceValueSum;
        for (uint256 i = 0; i < milestoneFaceValues.length; i++) {
            uint256 faceValue = milestoneFaceValues[i];
            uint256 discountedAdvance = discountedAdvances[i];
            uint256 dueTimestamp = dueTimestamps[i];

            if (faceValue == 0 || discountedAdvance == 0 || discountedAdvance > faceValue) {
                revert InvalidMilestoneConfiguration();
            }
            if (dueTimestamp > maturityTimestamp) revert InvalidMilestoneConfiguration();

            faceValueSum += faceValue;
            totalAdvance += discountedAdvance;
        }

        if (faceValueSum != totalFaceValue) revert InvalidMilestoneConfiguration();

        invoiceId = _nextInvoiceId++;
        Invoice storage invoice = _invoices[invoiceId];
        invoice.id = invoiceId;
        invoice.merchant = msg.sender;
        invoice.client = client;
        invoice.token = token;
        invoice.totalFaceValue = totalFaceValue;
        invoice.totalDiscountedAdvance = totalAdvance;
        invoice.fundingDeadline = fundingDeadline;
        invoice.maturityTimestamp = maturityTimestamp;
        invoice.milestoneCount = milestoneFaceValues.length;
        invoice.status = InvoiceStatus.Draft;

        for (uint256 i = 0; i < milestoneFaceValues.length; i++) {
            _milestones[invoiceId].push(
                Milestone({
                    id: i,
                    invoiceId: invoiceId,
                    faceValue: milestoneFaceValues[i],
                    discountedAdvance: discountedAdvances[i],
                    dueTimestamp: dueTimestamps[i],
                    proofHash: bytes32(0),
                    status: MilestoneStatus.PendingFunding,
                    funded: false,
                    submitted: false,
                    approved: false,
                    settled: false,
                    disputed: false,
                    fundedAt: 0,
                    submittedAt: 0,
                    approvedAt: 0,
                    settledAt: 0
                })
            );
        }

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            client,
            token,
            totalFaceValue,
            totalAdvance
        );
    }

    function clientSignInvoice(uint256 invoiceId) external invoiceExists(invoiceId) {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.client) revert Unauthorized();
        if (!_isSignable(invoice.status)) revert InvalidInvoiceStatus();
        if (invoice.clientSigned) revert AlreadySigned();

        invoice.clientSigned = true;
        _syncSignatureStatus(invoice);
        emit InvoiceClientSigned(invoiceId, msg.sender);
    }

    function merchantSignInvoice(uint256 invoiceId) external invoiceExists(invoiceId) {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.merchant) revert Unauthorized();
        if (!_isSignable(invoice.status)) revert InvalidInvoiceStatus();
        if (invoice.merchantSigned) revert AlreadySigned();

        invoice.merchantSigned = true;
        _syncSignatureStatus(invoice);
        emit InvoiceMerchantSigned(invoiceId, msg.sender);
    }

    function cancelDraftInvoice(uint256 invoiceId) external invoiceExists(invoiceId) {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.merchant) revert Unauthorized();
        if (
            invoice.status != InvoiceStatus.Draft &&
            invoice.status != InvoiceStatus.PartiallySigned &&
            invoice.status != InvoiceStatus.FullySigned
        ) revert InvalidInvoiceStatus();
        if (invoice.escrowDeposited != 0) revert InvalidInvoiceStatus();

        invoice.status = InvoiceStatus.Cancelled;
    }

    function fundEscrow(uint256 invoiceId) external invoiceExists(invoiceId) nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.client) revert Unauthorized();
        if (invoice.status != InvoiceStatus.FullySigned) revert InvalidInvoiceStatus();
        if (invoice.escrowDeposited != 0) revert EscrowAlreadyFunded();

        IERC20(invoice.token).safeTransferFrom(msg.sender, address(this), invoice.totalFaceValue);
        invoice.escrowDeposited = invoice.totalFaceValue;
        invoice.escrowRemaining = invoice.totalFaceValue;
        invoice.status = InvoiceStatus.EscrowFunded;

        emit EscrowFunded(invoiceId, msg.sender, invoice.totalFaceValue);
    }

    function fundMilestone(uint256 invoiceId, uint256 milestoneId)
        external
        invoiceExists(invoiceId)
        nonReentrant
    {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.escrowDeposited != invoice.totalFaceValue) revert EscrowNotFunded();
        if (invoice.isClosed || invoice.status == InvoiceStatus.Cancelled) revert InvalidInvoiceStatus();
        if (block.timestamp > invoice.fundingDeadline) revert FundingDeadlinePassed();
        if (milestoneId >= invoice.milestoneCount) revert InvalidMilestoneOrder();

        int256 nextMilestoneId = getNextFundableMilestone(invoiceId);
        if (nextMilestoneId < 0 || uint256(nextMilestoneId) != milestoneId) revert InvalidMilestoneOrder();

        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        if (milestone.funded) revert MilestoneAlreadyFunded();

        if (invoice.lp == address(0)) {
            invoice.lp = msg.sender;
        } else if (invoice.lp != msg.sender) {
            revert Unauthorized();
        }

        milestone.funded = true;
        milestone.fundedAt = block.timestamp;
        milestone.status = MilestoneStatus.Funded;

        if (invoice.status == InvoiceStatus.EscrowFunded) {
            invoice.status = InvoiceStatus.Active;
        }

        IERC20(invoice.token).safeTransferFrom(msg.sender, invoice.merchant, milestone.discountedAdvance);

        emit MilestoneFunded(invoiceId, milestoneId, msg.sender, milestone.discountedAdvance);
    }

    function submitMilestone(
        uint256 invoiceId,
        uint256 milestoneId,
        bytes32 proofHash
    ) external invoiceExists(invoiceId) {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.merchant) revert Unauthorized();
        if (invoice.isClosed || invoice.status == InvoiceStatus.Cancelled) revert InvalidInvoiceStatus();
        if (proofHash == bytes32(0)) revert ProofHashRequired();
        if (milestoneId >= invoice.milestoneCount) revert InvalidMilestoneOrder();

        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        if (!milestone.funded) revert MilestoneNotFunded();
        if (milestone.submitted) revert MilestoneAlreadySubmitted();

        milestone.proofHash = proofHash;
        milestone.submitted = true;
        milestone.submittedAt = block.timestamp;
        milestone.status = MilestoneStatus.Submitted;

        emit MilestoneSubmitted(invoiceId, milestoneId, proofHash);
    }

    function approveMilestone(uint256 invoiceId, uint256 milestoneId) external invoiceExists(invoiceId) {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.client) revert Unauthorized();
        if (invoice.isClosed || invoice.status == InvoiceStatus.Cancelled) revert InvalidInvoiceStatus();
        if (milestoneId >= invoice.milestoneCount) revert InvalidMilestoneOrder();

        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        if (!milestone.submitted) revert MilestoneNotSubmitted();
        if (milestone.approved) revert MilestoneAlreadyApproved();

        milestone.approved = true;
        milestone.approvedAt = block.timestamp;
        milestone.status = MilestoneStatus.Approved;

        emit MilestoneApproved(invoiceId, milestoneId, msg.sender);
    }

    function settleMilestone(uint256 invoiceId, uint256 milestoneId)
        public
        invoiceExists(invoiceId)
        nonReentrant
    {
        Invoice storage invoice = _invoices[invoiceId];
        if (block.timestamp < invoice.maturityTimestamp) revert SettlementNotOpen();
        if (invoice.isClosed || invoice.status == InvoiceStatus.Cancelled) revert InvalidInvoiceStatus();
        if (milestoneId >= invoice.milestoneCount) revert InvalidMilestoneOrder();

        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        if (milestone.settled) revert MilestoneAlreadySettled();

        if (milestone.funded && milestone.approved && !milestone.disputed) {
            milestone.settled = true;
            milestone.settledAt = block.timestamp;
            milestone.status = MilestoneStatus.Settled;
            invoice.escrowRemaining -= milestone.faceValue;

            IERC20(invoice.token).safeTransfer(invoice.lp, milestone.faceValue);
            emit MilestoneSettled(invoiceId, milestoneId, invoice.lp, milestone.faceValue);
        } else if (!milestone.disputed) {
            _markMilestoneDisputed(invoiceId, milestoneId, invoice, milestone);
        }

        _refreshInvoiceLifecycle(invoiceId);
    }

    function settleApprovedMilestones(uint256 invoiceId) external invoiceExists(invoiceId) nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (block.timestamp < invoice.maturityTimestamp) revert SettlementNotOpen();
        if (invoice.isClosed || invoice.status == InvoiceStatus.Cancelled) revert InvalidInvoiceStatus();

        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = _milestones[invoiceId][i];
            if (milestone.settled || milestone.disputed) {
                continue;
            }

            if (milestone.funded && milestone.approved) {
                milestone.settled = true;
                milestone.settledAt = block.timestamp;
                milestone.status = MilestoneStatus.Settled;
                invoice.escrowRemaining -= milestone.faceValue;

                IERC20(invoice.token).safeTransfer(invoice.lp, milestone.faceValue);
                emit MilestoneSettled(invoiceId, i, invoice.lp, milestone.faceValue);
            } else {
                _markMilestoneDisputed(invoiceId, i, invoice, milestone);
            }
        }

        _refreshInvoiceLifecycle(invoiceId);
    }

    function closeInvoice(uint256 invoiceId) external invoiceExists(invoiceId) {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.merchant && msg.sender != invoice.client) revert Unauthorized();
        if (!_allMilestonesTerminal(invoiceId)) revert InvoiceNotTerminal();

        invoice.isClosed = true;
        invoice.status = InvoiceStatus.Closed;
        emit InvoiceClosed(invoiceId, msg.sender);
    }

    function refundLeftover(uint256 invoiceId) external invoiceExists(invoiceId) nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (msg.sender != invoice.client) revert Unauthorized();
        if (!invoice.isClosed) revert InvalidInvoiceStatus();
        if (invoice.leftoverRefunded) revert AlreadyRefunded();
        if (invoice.escrowRemaining == 0) revert NoRefundAvailable();

        uint256 refundAmount = invoice.escrowRemaining;
        invoice.leftoverRefunded = true;
        invoice.escrowRemaining = 0;

        IERC20(invoice.token).safeTransfer(invoice.client, refundAmount);
        emit LeftoverRefunded(invoiceId, msg.sender, refundAmount);
    }

    function getInvoice(uint256 invoiceId) external view invoiceExists(invoiceId) returns (Invoice memory) {
        return _invoices[invoiceId];
    }

    function getMilestone(uint256 invoiceId, uint256 milestoneId)
        external
        view
        invoiceExists(invoiceId)
        returns (Milestone memory)
    {
        if (milestoneId >= _invoices[invoiceId].milestoneCount) revert InvalidMilestoneOrder();
        return _milestones[invoiceId][milestoneId];
    }

    function getMilestones(uint256 invoiceId)
        external
        view
        invoiceExists(invoiceId)
        returns (Milestone[] memory)
    {
        return _milestones[invoiceId];
    }

    function getNextFundableMilestone(uint256 invoiceId)
        public
        view
        invoiceExists(invoiceId)
        returns (int256)
    {
        Invoice storage invoice = _invoices[invoiceId];
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = _milestones[invoiceId][i];
            if (milestone.funded) {
                continue;
            }
            if (i == 0) {
                return int256(i);
            }

            Milestone storage previousMilestone = _milestones[invoiceId][i - 1];
            if (previousMilestone.funded && previousMilestone.submitted && previousMilestone.approved) {
                return int256(i);
            }
            return -1;
        }
        return -1;
    }

    function canFundMilestone(uint256 invoiceId, uint256 milestoneId)
        external
        view
        invoiceExists(invoiceId)
        returns (bool)
    {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.escrowDeposited != invoice.totalFaceValue || block.timestamp > invoice.fundingDeadline) {
            return false;
        }
        return getNextFundableMilestone(invoiceId) == int256(milestoneId);
    }

    function canSubmitMilestone(uint256 invoiceId, uint256 milestoneId)
        external
        view
        invoiceExists(invoiceId)
        returns (bool)
    {
        if (milestoneId >= _invoices[invoiceId].milestoneCount) return false;
        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        return milestone.funded && !milestone.submitted;
    }

    function canApproveMilestone(uint256 invoiceId, uint256 milestoneId)
        external
        view
        invoiceExists(invoiceId)
        returns (bool)
    {
        if (milestoneId >= _invoices[invoiceId].milestoneCount) return false;
        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        return milestone.submitted && !milestone.approved;
    }

    function canSettleMilestone(uint256 invoiceId, uint256 milestoneId)
        external
        view
        invoiceExists(invoiceId)
        returns (bool)
    {
        if (milestoneId >= _invoices[invoiceId].milestoneCount) return false;
        Invoice storage invoice = _invoices[invoiceId];
        Milestone storage milestone = _milestones[invoiceId][milestoneId];
        if (block.timestamp < invoice.maturityTimestamp || milestone.settled || milestone.disputed) {
            return false;
        }
        return true;
    }

    function getInvoiceSummary(uint256 invoiceId)
        external
        view
        invoiceExists(invoiceId)
        returns (InvoiceSummary memory summary)
    {
        Invoice storage invoice = _invoices[invoiceId];
        summary.invoiceId = invoiceId;
        summary.status = invoice.status;
        summary.totalFaceValue = invoice.totalFaceValue;
        summary.totalDiscountedAdvance = invoice.totalDiscountedAdvance;
        summary.escrowDeposited = invoice.escrowDeposited;
        summary.escrowRemaining = invoice.escrowRemaining;
        summary.nextFundableMilestoneId = getNextFundableMilestone(invoiceId);
        summary.allTerminal = _allMilestonesTerminal(invoiceId);

        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = _milestones[invoiceId][i];
            if (milestone.funded) summary.fundedCount++;
            if (milestone.approved) summary.approvedCount++;
            if (milestone.settled) summary.settledCount++;
            if (milestone.disputed) summary.disputedCount++;
        }
    }

    function _syncSignatureStatus(Invoice storage invoice) private {
        if (invoice.clientSigned && invoice.merchantSigned) {
            invoice.status = InvoiceStatus.FullySigned;
        } else {
            invoice.status = InvoiceStatus.PartiallySigned;
        }
    }

    function _markMilestoneDisputed(
        uint256 invoiceId,
        uint256 milestoneId,
        Invoice storage invoice,
        Milestone storage milestone
    ) private {
        milestone.disputed = true;
        milestone.status = MilestoneStatus.Disputed;
        invoice.status = InvoiceStatus.InDispute;
        emit MilestoneDisputed(invoiceId, milestoneId);
    }

    function _refreshInvoiceLifecycle(uint256 invoiceId) private {
        Invoice storage invoice = _invoices[invoiceId];
        bool hasDispute;

        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = _milestones[invoiceId][i];
            if (milestone.disputed) {
                hasDispute = true;
                break;
            }
        }

        invoice.status = hasDispute ? InvoiceStatus.InDispute : InvoiceStatus.Matured;
    }

    function _allMilestonesTerminal(uint256 invoiceId) private view returns (bool) {
        Invoice storage invoice = _invoices[invoiceId];
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = _milestones[invoiceId][i];
            if (!milestone.settled && !milestone.disputed) {
                return false;
            }
        }
        return true;
    }

    function _isSignable(InvoiceStatus status) private pure returns (bool) {
        return status == InvoiceStatus.Draft || status == InvoiceStatus.PartiallySigned || status == InvoiceStatus.FullySigned;
    }
}
