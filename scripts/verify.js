const hre = require("hardhat");
const deployInfo = require('../deployments.json');

// 添加延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 添加重试机制
async function verifyWithRetry(address, constructorArguments, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: constructorArguments
            });
            return true;
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log("   合约已经验证过了");
                return true;
            }
            if (i === retries - 1) throw error;
            console.log(`   验证失败，${retries - i - 1}次重试机会...`);
            await delay(5000); // 等待5秒后重试
        }
    }
    return false;
}

async function main() {
    console.log("\n开始验证合约...");
    console.log("网络:", hre.network.name);
    console.log("SMToken 地址:", deployInfo.smToken.address);
    console.log("DepositContract 地址:", deployInfo.depositContract.address);

    try {
        // 1. 验证 SMToken
        console.log("\n1. 验证 SMToken 合约...");
        await verifyWithRetry(
            deployInfo.smToken.address, 
            []
        );
        console.log("   SMToken 验证成功！");

        // 等待一段时间再验证下一个合约
        await delay(3000);

        // 2. 验证 DepositContract
        console.log("\n2. 验证 DepositContract 合约...");
        await verifyWithRetry(
            deployInfo.depositContract.address, 
            [deployInfo.smToken.address]
        );
        console.log("   DepositContract 验证成功！");

        console.log("\n✅ 所有合约验证完成！");
        
    } catch (error) {
        console.error("\n❌ 验证过程中发生错误:");
        if (error.message.includes("Timeout")) {
            console.error("网络连接超时，请检查网络连接后重试");
        } else if (error.message.includes("API KEY")) {
            console.error("Etherscan API Key 无效，请检查配置");
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });