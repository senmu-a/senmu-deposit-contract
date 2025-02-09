// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DepositContract {
    using SafeERC20 for IERC20;

    struct DepositInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 lastInterestCalculation;
    }

    // 常量定义
    uint256 private constant ANNUAL_INTEREST_RATE = 500; // 5%
    address private constant ETH_ADDRESS = address(0);
    uint256 private constant SECONDS_PER_YEAR = 31536000;

    address private owner;

    // token地址 => 用户地址 => 存款信息
    mapping(address => mapping(address => DepositInfo)) private deposits;

    // 支持的代币列表
    mapping(address => bool) public supportedTokens;

    // 事件定义
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Deposit(address indexed token, address indexed user, uint256 amount);
    event Withdraw(
        address indexed token,
        address indexed user,
        uint256 amount,
        uint256 interest
    );
    event InterestCalculated(
        address indexed token,
        address indexed user,
        uint256 amount
    );

    constructor(address _smTokenAddress) {
        owner = msg.sender;
        _addSupportedToken(_smTokenAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // 添加支持的代币
    function addSupportedToken(address token) external onlyOwner {
        _addSupportedToken(token);
    }

    function _addSupportedToken(address token) private {
        require(token != ETH_ADDRESS, "Cannot add ETH as token");
        require(!supportedTokens[token], "Token already supported");
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    // 移除支持的代币
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    // 存入 ETH
    function deposit() public payable {
        require(msg.value > 0, "Amount must be > 0");
        _deposit(ETH_ADDRESS, msg.value);
    }

    // 存入代币
    function depositToken(address token, uint256 amount) public {
        require(amount > 0, "Amount must be > 0");
        require(supportedTokens[token], "Token not supported");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _deposit(token, amount);
    }

    // 统一的存款处理逻辑
    function _deposit(address token, uint256 amount) private {
        DepositInfo storage depositInfo = deposits[token][msg.sender];

        if (depositInfo.amount > 0) {
            uint256 interest = _calculateInterest(token, msg.sender);
            depositInfo.amount += interest;
            emit InterestCalculated(token, msg.sender, interest);
        }

        depositInfo.amount += amount;
        depositInfo.timestamp = block.timestamp;
        depositInfo.lastInterestCalculation = block.timestamp;

        emit Deposit(token, msg.sender, amount);
    }

    // 提取 ETH
    function withdraw(uint256 amount) public {
        _withdraw(ETH_ADDRESS, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // 提取代币
    function withdrawToken(address token, uint256 amount) public {
        require(supportedTokens[token], "Token not supported");
        _withdraw(token, amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // 统一的提取处理逻辑
    function _withdraw(address token, uint256 amount) private {
        require(amount > 0, "Amount must be > 0");

        DepositInfo storage depositInfo = deposits[token][msg.sender];
        uint256 interest = _calculateInterest(token, msg.sender);
        uint256 totalBalance = depositInfo.amount + interest;

        require(totalBalance >= amount, "Insufficient balance");

        depositInfo.amount = totalBalance - amount;
        depositInfo.lastInterestCalculation = block.timestamp;

        emit Withdraw(token, msg.sender, amount, interest);
    }

    // 统一的利息计算逻辑
    function _calculateInterest(
        address token,
        address user
    ) private view returns (uint256) {
        DepositInfo storage depositInfo = deposits[token][user];

        uint256 timeElapsed = block.timestamp -
            depositInfo.lastInterestCalculation;
        uint256 yearsElapsed = timeElapsed / SECONDS_PER_YEAR;

        return
            (depositInfo.amount * ANNUAL_INTEREST_RATE * yearsElapsed) / 10000;
    }

    // 查询余额
    function getBalance(
        address token,
        address user
    ) public view returns (uint256) {
        if (token != ETH_ADDRESS && !supportedTokens[token]) {
            return 0;
        }
        return deposits[token][user].amount + _calculateInterest(token, user);
    }

    // 查询合约中的余额
    function getTotalBalance(address token) public view returns (uint256) {
        if (token == ETH_ADDRESS) {
            return address(this).balance;
        }
        require(supportedTokens[token], "Token not supported");
        return IERC20(token).balanceOf(address(this));
    }

    receive() external payable {
        revert("Use deposit() to deposit ETH");
    }

    fallback() external payable {
        revert("Function does not exist");
    }
}
