// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract DeadManSwitch {
    //-----------------------------------
    //-----STORAGE-----------------------
    //-----------------------------------
    address public owner;
    uint96 public lastPing;
    address payable public heir;
    uint96 public inactivityDelay;



}