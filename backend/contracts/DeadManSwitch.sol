// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

//-----------------------------------
//-----ERRORS--------------------------
//-----------------------------------
error NotOwner();
error ZeroAddress();
error InvalidDelay();
error NotYetExpired();
error NoFunds();
error InsufficientFee();
error NotHeir();
error TransferFailed();

contract DeadManSwitch {
    //-----------------------------------
    //-----STORAGE-----------------------
    //-----------------------------------
    address public owner;
    uint96 public lastPing;
    address payable public heir;
    uint96 public inactivityDelay;
    uint16 public constant FEE_DEPOSIT_BPS = 10;
    uint256 public constant FEE_HEIR_CHANGE = 0.001 ether;
    address payable public immutable feeRecipient;
    uint96 public constant MIN_DELAY = 30 days;

    //-----------------------------------
    //-----EVENTS------------------------
    //-----------------------------------
    event Deposited(address indexed owner, uint256 amount);
    event Pinged(address indexed owner, uint96 timestamp);
    event HeirChanged(address indexed oldHeir, address indexed newHeir);
    event DelayChanged(uint96 oldDelay, uint96 newDelay);
    event Claimed(address indexed heir, uint256 amount);

    //-----------------------------------
    //-----MODIFIERS---------------------
    //-----------------------------------
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    //-----------------------------------
    //-----CONSTRUCTOR-------------------
    //-----------------------------------
    constructor(address _owner, address payable _heir, uint96 _delay, address payable _feeRecipient) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_heir == address(0)) revert ZeroAddress();
        if (_delay < MIN_DELAY) revert InvalidDelay();
        if (_feeRecipient == address(0)) revert ZeroAddress();

        owner = _owner;
        heir = _heir;
        inactivityDelay = _delay;
        lastPing = uint96(block.timestamp);
        feeRecipient = _feeRecipient;
    }

    //-----------------------------------
    //-----FUNCTIONS---------------------
    //-----------------------------------
    function deposit() external payable {
        if (msg.value == 0) revert NoFunds();

        uint256 fee = (msg.value * FEE_DEPOSIT_BPS) / 10000;
        unchecked {
            emit Deposited(msg.sender, msg.value - fee);
        }
        (bool ok,) = feeRecipient.call{value: fee}("");

        if (!ok) revert TransferFailed();
    }


    function ping() external onlyOwner {
        uint96 ts = uint96(block.timestamp);        
        lastPing = ts;

        emit Pinged(msg.sender, ts);
    }

    function setHeir(address payable _newHeir) external payable onlyOwner {
        if (_newHeir == address(0)) revert ZeroAddress();
        if (msg.value < FEE_HEIR_CHANGE) revert InsufficientFee();

        emit HeirChanged(heir, _newHeir);

        lastPing = uint96(block.timestamp);
        heir = _newHeir;
        (bool ok,) = feeRecipient.call{value: msg.value}("");
        
        if (!ok) revert TransferFailed();
    }


    function setDelay(uint96 _newDelay) external onlyOwner {
        if (_newDelay < MIN_DELAY) revert InvalidDelay();

        emit DelayChanged(inactivityDelay, _newDelay);

        lastPing = uint96(block.timestamp);
        inactivityDelay = _newDelay;
    }

    function claim() external {
        if (msg.sender != heir) revert NotHeir();
        if (block.timestamp < uint256(lastPing) + uint256(inactivityDelay)) revert NotYetExpired();

        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFunds();

        (bool success, ) = heir.call{value: balance}("");
        if (!success) revert TransferFailed();

        emit Claimed(msg.sender, balance);
    }
}