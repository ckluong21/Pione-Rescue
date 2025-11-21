const { ethers, run, network } = require("hardhat");
const { developmentChains, blockConfirmation } = require("../helper-hardhat-config");
require("dotenv").config();

const EXPLORER_API_KEY = process.env.EXPLORER_API_KEY || "";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
    console.log("Network:", network.name);

    // Deploy VisionMateLedger
    console.log("Deploying VisionMateLedger..."); // <--- SỬA LOG

    // SỬA TÊN CONTRACT (phải khớp 100% với tên trong file .sol)
    const VisionMateLedger = await ethers.getContractFactory("VisionMateLedger"); // <--- SỬA TÊN CONTRACT
    
    // SỬA TÊN BIẾN (cho dễ đọc)
    const visionMateContract = await VisionMateLedger.deploy(); // <--- SỬA BIẾN

    await visionMateContract.waitForDeployment();
    
    // SỬA TÊN BIẾN
    const visionMateContractAddress = await visionMateContract.getAddress(); // <--- SỬA BIẾN

    console.log("VisionMateLedger deployed to:", visionMateContractAddress); // <--- SỬA LOG
    console.log("Transaction hash:", visionMateContract.deploymentTransaction().hash); // <--- SỬA BIẾN

    // Wait for block confirmations before verification
    if (!developmentChains.includes(network.name) && EXPLORER_API_KEY) {
        const confirmations = blockConfirmation[network.name] || 6;
        console.log(`Waiting for ${confirmations} block confirmations...`);

        // SỬA TÊN BIẾN
        await visionMateContract.deploymentTransaction().wait(confirmations); // <--- SỬA BIẾN
        console.log("Block confirmations completed. Starting verification...");

        // Verify contract
        try {
            await run("verify:verify", {
                address: visionMateContractAddress, // <--- SỬA ĐỊA CHỈ
                
                // SỬA ĐƯỜNG DẪN (Rất quan trọng!)
                // Phải là: contracts/Tên_File.sol:Tên_Contract
                contract: `contracts/VisionMateLedger.sol:VisionMateLedger`, // <--- SỬA ĐƯỜNG DẪN
                
                constructorArguments: [], // Contract của chúng ta không có tham số constructor
            });
            console.log("Contract verified successfully!");
        } catch (error) {
            if (error.message.toLowerCase().includes("already verified")) {
                console.log("Contract already verified!");
            } else {
                console.log("Verification failed:", error.message);
            }
        }
    } else if (developmentChains.includes(network.name)) {
        console.log("Local network detected. Skipping verification.");
    } else {
        console.log("EXPLORER_API_KEY not found. Skipping verification.");
    }

    console.log("Deployment completed!");
    console.log("VisionMateLedger Contract Address:", visionMateContractAddress); // <--- SỬA LOG
    
    // Contract VisionMateLedger CÓ "owner", nên chúng ta nên log nó ra
    console.log("Owner:", await visionMateContract.owner()); // <--- GIỮ LẠI & SỬA BIẾN
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });