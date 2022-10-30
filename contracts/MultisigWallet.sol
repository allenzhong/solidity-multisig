// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract MultisigWallet  {
  
  constructor(address[] memory _owners, uint _numConfirmationsRequired) public {
    require(_owners.length > 0, 'owners required');
    
    require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "invalid number of required confirmations");
  }
}