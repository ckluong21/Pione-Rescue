const { ethers, run, network } = require("hardhat");
const { developmentChains, blockConfirmation } = require("../helper-hardhat-config");
require("dotenv").config();

const EXPLORER_API_KEY = process.env.EXPLORER_API_KEY || "";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
    console.log("Network:", network.name);

    // Deploy EmergencyRescue
    console.log("Deploying EmergencyRescue...");
    // SỬA TÊN CONTRACT TẠI ĐÂY
    const EmergencyRescue = await ethers.getContractFactory("EmergencyRescue");
    // SỬA BIẾN TẠI ĐÂY
    const rescueContract = await EmergencyRescue.deploy(); 

    await rescueContract.waitForDeployment();
    // SỬA BIẾN TẠI ĐÂY
    const rescueContractAddress = await rescueContract.getAddress(); 

    console.log("EmergencyRescue deployed to:", rescueContractAddress);
    console.log("Transaction hash:", rescueContract.deploymentTransaction().hash);

    // Wait for block confirmations before verification
    if (!developmentChains.includes(network.name) && EXPLORER_API_KEY) {
        const confirmations = blockConfirmation[network.name] || 6;
        console.log(`Waiting for ${confirmations} block confirmations...`);

        // SỬA BIẾN TẠI ĐÂY
        await rescueContract.deploymentTransaction().wait(confirmations); 
        console.log("Block confirmations completed. Starting verification...");

        // Verify contract
        try {
            await run("verify:verify", {
                address: rescueContractAddress, // SỬA ĐỊA CHỈ
                contract: `contracts/EmergencyRescue.sol:EmergencyRescue`, // SỬA ĐƯỜNG DẪN
                constructorArguments: [],
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
    console.log("EmergencyRescue Contract Address:", rescueContractAddress); // SỬA LOG
    console.log("Owner:", await rescueContract.owner()); // SỬA BIẾN
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });