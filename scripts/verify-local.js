const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

const { expect } = require("chai");

async function main() {
    try {
        console.log("\n开始本地验证...");

        // 检查 deployments.json 是否存在
        const deploymentPath = path.join(__dirname, '../deployments.json');
        if (!fs.existsSync(deploymentPath)) {
            throw new Error("找不到 deployments.json 文件，请先运行部署脚本");
        }

        // 读取并解析部署信息
        const deployInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        
        // 验证部署信息完整性
        if (!deployInfo.smToken?.address || !deployInfo.depositContract?.address) {
            throw new Error("部署信息不完整，请重新部署合约");
        }

        // 获取账户
        const [deployer, user1] = await ethers.getSigners();
        console.log("部署账户:", deployer.address);
        console.log("测试账户:", user1.address);

        // 连接到已部署的合约
        const smToken = await ethers.getContractAt("SMToken", deployInfo.smToken.address);
        const depositContract = await ethers.getContractAt("DepositContract", deployInfo.depositContract.address);
        
        // 验证合约地址
        const smTokenAddress = await smToken.getAddress();
        const depositContractAddress = await depositContract.getAddress();
        console.log("\n合约地址:");
        console.log("SMToken:", smTokenAddress);
        console.log("DepositContract:", depositContractAddress);

        // 1. 验证基本信息
        console.log("\n1. 验证合约基本信息:");
        const name = await smToken.name();
        const symbol = await smToken.symbol();
        const totalSupply = await smToken.totalSupply();
        console.log("   代币名称:", name);
        console.log("   代币符号:", symbol);
        console.log("   总供应量:", ethers.formatEther(totalSupply));

         // 2. 测试代币转账功能
         console.log("\n2. 测试代币转账功能...");
         const transferAmount = ethers.parseEther("1000");
         const initialBalance = await smToken.balanceOf(user1.address);
         
         // 转账前记录余额
         console.log("   初始余额:", ethers.formatEther(initialBalance));
         
         // 执行转账
         await smToken.connect(deployer).transfer(user1.address, transferAmount);
         
         // 转账后检查新余额
         const newBalance = await smToken.balanceOf(user1.address);
         console.log("   转账后余额:", ethers.formatEther(newBalance));
         
         // 验证余额增加量是否等于转账金额
         const balanceIncrease = newBalance - initialBalance;
         expect(balanceIncrease).to.equal(transferAmount);

         // 3. 测试代币存款功能
         console.log("\n3. 测试代币存款功能...");
         const depositAmount = ethers.parseEther("100");
         
         // 记录存款前余额
         const beforeDepositBalance = await depositContract.getBalance(smTokenAddress, user1.address);
         
         // 授权并存款
         await smToken.connect(user1).approve(depositContractAddress, depositAmount);
         await depositContract.connect(user1).depositToken(smTokenAddress, depositAmount);
         
         // 验证存款余额
         const afterDepositBalance = await depositContract.getBalance(smTokenAddress, user1.address);
         console.log("   存款前余额:", ethers.formatEther(beforeDepositBalance));
         console.log("   存款金额:", ethers.formatEther(depositAmount));
         console.log("   存款后余额:", ethers.formatEther(afterDepositBalance));
         
         // 验证存款后余额增加量
         const depositIncrease = afterDepositBalance - beforeDepositBalance;
         expect(depositIncrease).to.equal(depositAmount);

        // 4. 测试 ETH 存款功能
        console.log("\n4. 测试 ETH 存款功能...");
        const ethAmount = ethers.parseEther("1.0");
        
        // 存入 ETH
        await depositContract.connect(user1).deposit({ value: ethAmount });
        const ethBalance = await depositContract.getBalance(ethers.ZeroAddress, user1.address);
        console.log("   存入 ETH:", ethers.formatEther(ethAmount));
        console.log("   ETH 余额:", ethers.formatEther(ethBalance));
        expect(ethBalance).to.equal(ethAmount);

        // 5. 验证合约总余额
        console.log("\n5. 验证合约总余额...");
        const contractEthBalance = await ethers.provider.getBalance(depositContractAddress);
        const contractTokenBalance = await smToken.balanceOf(depositContractAddress);
        console.log("   合约 ETH 余额:", ethers.formatEther(contractEthBalance));
        console.log("   合约代币余额:", ethers.formatEther(contractTokenBalance));
        expect(contractEthBalance).to.equal(ethAmount);
        expect(contractTokenBalance).to.equal(depositAmount);

        console.log("\n✅ 验证完成！所有功能正常运行。");

    } catch (error) {
        console.error("\n❌ 验证过程中发生错误:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });