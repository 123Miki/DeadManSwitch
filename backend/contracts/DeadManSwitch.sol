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
    constructor(address payable _heir, uint96 _delay, address payable _feeRecipient) {
        if (_heir == address(0)) revert ZeroAddress();
        if (_delay == 0) revert InvalidDelay();
        if (_feeRecipient == address(0)) revert ZeroAddress();

        owner = msg.sender;
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
        feeRecipient.transfer(fee);

        emit Deposited(msg.sender, msg.value - fee);
    }



}