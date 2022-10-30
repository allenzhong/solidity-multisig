// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract MultisigWallet {
  address[] public owners;
  // mapping(address => bool) public isOwner;
  // uint numConfirmationsRequired;

  constructor(address[] memory _owners, uint256 _numConfirmationsRequired)
    public
  {
    require(_owners.length > 0, "owners required");

    require(
      _numConfirmationsRequired > 0 &&
        _numConfirmationsRequired <= _owners.length,
      "invalid number of required confirmations"
    );

    for (uint i = 0; i < _owners.length; i++) {
      address owner = _owners[i];
      require(owner != address(0), "invalid owner");
    }
  }
}
