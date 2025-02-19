import { ethers } from "hardhat";

async function main() {
  // Get the contract factory for ReverseDutchAuction
  const ReverseDutchAuction = await ethers.getContractFactory("ReverseDutchAuction");

  // Deploy the contract
  console.log("Deploying ReverseDutchAuction...");
  const reverseDutchAuction = await ReverseDutchAuction.deploy();

  // Wait for the deployment to complete
  await reverseDutchAuction.waitForDeployment();

  // Log the deployed contract address
  console.log(`ReverseDutchAuction deployed to: ${await reverseDutchAuction.getAddress()}`);
}

// Run the deployment script and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });