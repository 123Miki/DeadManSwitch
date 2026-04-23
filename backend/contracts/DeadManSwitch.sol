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

contract DeadManSwitch {
    //-----------------------------------
    //-----STORAGE-----------------------
    //-----------------------------------
    address public owner;
    uint96 public lastPing;
    address payable public heir;
    uint96 public inactivityDelay;

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


}