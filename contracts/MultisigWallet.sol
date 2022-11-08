// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract MultisigWallet {
  event Deposit(address indexed sender, uint256 amount, uint256 balance);
  event SubmitTransaction(
    address indexed owner,
    uint256 indexed txIndex,
    address indexed to,
    uint256 value,
    bytes data
  );
  event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);

  address[] public owners;
  mapping(address => bool) public isOwner;
  uint256 public numConfirmationsRequired;

  struct Transaction {
    address to;
    uint256 value;
    bytes data;
    bool executed;
    mapping(address => bool) isConfirmed;
    uint256 numConfirmations;
  }

  Transaction[] public transactions;

  modifier onlyOwner() {
    require(isOwner[msg.sender], "not an owner");
    _;
  }

  modifier txExists(uint256 _txIndex) {
    require(_txIndex < transactions.length, "tx does not exist");
    _;
  }

  modifier notConfirmed(uint256 _txIndex) {
    require(
      !transactions[_txIndex].isConfirmed[msg.sender],
      "tx already confirmed"
    );
    _;
  }

  constructor(address[] memory _owners, uint256 _numConfirmationsRequired)
    public
  {
    require(_owners.length > 0, "owners required");

    require(
      _numConfirmationsRequired > 0 &&
        _numConfirmationsRequired <= _owners.length,
      "invalid number of required confirmations"
    );

    for (uint256 i = 0; i < _owners.length; i++) {
      address owner = _owners[i];
      require(owner != address(0), "invalid owner");
      require(!isOwner[owner], "owner not unique");

      isOwner[owner] = true;
      owners.push(owner);
    }

    numConfirmationsRequired = _numConfirmationsRequired;
  }

  function getOwners() public view returns (address[] memory) {
    return owners;
  }

  // https://solidity-by-example.org/sending-ether/
  receive() external payable {
    emit Deposit(msg.sender, msg.value, address(this).balance);
  }

  fallback() external payable {}

  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  function submitTransaction(
    address payable _to,
    uint256 _value,
    bytes memory _data
  ) public onlyOwner {
    uint256 txIndex = transactions.length;

    Transaction storage transaction = transactions.push();
    transaction.to = _to;
    transaction.value = _value;
    transaction.data = _data;
    transaction.executed = false;
    transaction.numConfirmations = 0;

    emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
  }

  function confirmTransaction(uint256 _txIndex)
    public
    onlyOwner
    txExists(_txIndex)
    notConfirmed(_txIndex)
  {
    Transaction storage transaction = transactions[_txIndex];

    transaction.isConfirmed[msg.sender] = true;
    transaction.numConfirmations += 1;

    emit ConfirmTransaction(msg.sender, _txIndex);
  }
}
