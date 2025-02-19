import { ethers } from "hardhat";

async function main() {
  const ReverseDutchAuction = await ethers.getContractFactory("ReverseDutchAuction");
  const reverseDutchAuction = await ReverseDutchAuction.deploy();

  await reverseDutchAuction.deployed();
  console.log(`ReverseDutchAuction deployed to: ${reverseDutchAuction.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });