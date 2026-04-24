// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./DeadManSwitch.sol";

//-----------------------------------
//-----ERRORS------------------------
//-----------------------------------
error AlreadyExists();

contract DeadManSwitchFactory {
    //-----------------------------------
    //-----STORAGE-----------------------
    //-----------------------------------
    address payable public immutable feeRecipient;
    mapping(address => address) public switches;

    //-----------------------------------
    //-----EVENTS------------------------
    //-----------------------------------
    event SwitchCreated(address indexed owner, address indexed switchAddress);

    //-----------------------------------
    //-----CONSTRUCTOR-------------------
    //-----------------------------------
    constructor(address payable _feeRecipient) {
        if (_feeRecipient == address(0)) revert ZeroAddress();

        feeRecipient = _feeRecipient;
    }

    //-----------------------------------
    //-----FUNCTIONS---------------------
    //-----------------------------------
    function createSwitch(address payable _heir, uint96 _delay) external returns (address) {
        address existing = switches[msg.sender];
        if (existing != address(0) && address(existing).balance > 0) revert AlreadyExists();

        DeadManSwitch newSwitch = new DeadManSwitch(msg.sender, _heir, _delay, feeRecipient);
        switches[msg.sender] = address(newSwitch);

        emit SwitchCreated(msg.sender, address(newSwitch));

        return address(newSwitch);
    }
}
