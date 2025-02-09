// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract SMToken is ERC20 {
  string public constant NAME = "senmuERC20Token";
  string public constant SYMBOL = "SM";
  uint256 public constant INITIAL_SUPPLY = 1000000;
  constructor() ERC20(NAME, SYMBOL) {
    _mint(msg.sender, INITIAL_SUPPLY * (10 ** decimals()));
  }

}
