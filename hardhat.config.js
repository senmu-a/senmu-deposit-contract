require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  defaultNetwork: "sepolia",
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    // 添加超时配置
    timeout: 60000
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [process.env.PRIVATE_KEY],
      // 添加超时配置
      timeout: 60000, // 60 秒
      // 添加确认数
      confirmations: 2
    },

    // 单元测试
    hardhat: {
      mining: {
        auto: true,
        interval: 0
      }
    },

    // 本地 Ganache 网络
    ganache: {
      url: "http://127.0.0.1:7545",  // Ganache GUI 默认 RPC 服务器
      chainId: 1337
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,  // 添加此配置
      evmVersion: "paris",  // 指定 EVM 版本
      outputSelection: {
        "*": {
          "*": ["evm.bytecode", "evm.deployedBytecode", "abi"]
        }
      }
    }
  },
};
