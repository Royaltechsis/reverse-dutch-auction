import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReverseDutchAuction", function () {
  let reverseDutchAuction: any;
  let mockToken: any;
  let seller: any;
  let buyer: any;

  beforeEach(async function () {
    [seller, buyer] = await ethers.getSigners();

    // Deploy the Reverse Dutch Auction contract
    const ReverseDutchAuction = await ethers.getContractFactory("ReverseDutchAuction");
    reverseDutchAuction = await ReverseDutchAuction.deploy(); // No need for .deployed()

    // Deploy a mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MTK", 1000000);
    await mockToken.deployed();

    // Approve tokens for auction
    await mockToken.connect(seller).approve(reverseDutchAuction.address, 1);
  });

  it("Should decrease price correctly over time", async function () {
    // Create an auction
    await reverseDutchAuction
      .connect(seller)
      .createAuction(mockToken.address, ethers.parseEther("10"), 60, 100);

    const auctionId = 1;
    const initialPrice = await reverseDutchAuction.getCurrentPrice(auctionId);

    // Increase time by 30 seconds
    await ethers.provider.send("evm_increaseTime", [30]);
    await ethers.provider.send("evm_mine", []);

    const decreasedPrice = await reverseDutchAuction.getCurrentPrice(auctionId);

    // Ensure the price has decreased
    expect(decreasedPrice).to.be.lt(initialPrice);
  });

  it("Should only allow one buyer per auction", async function () {
    // Create an auction
    await reverseDutchAuction
      .connect(seller)
      .createAuction(mockToken.address, ethers.utils.parseEther("10"), 60, 100);

    const auctionId = 1;
    const currentPrice = await reverseDutchAuction.getCurrentPrice(auctionId);

    // Finalize the auction as the first buyer
    await reverseDutchAuction.connect(buyer).finalizeAuction(auctionId, {
      value: currentPrice,
    });

    // Attempt to finalize again as the same buyer (should fail)
    await expect(
      reverseDutchAuction.connect(buyer).finalizeAuction(auctionId, {
        value: currentPrice,
      })
    ).to.be.revertedWith("Auction already finalized");
  });

  it("Should swap funds and tokens correctly", async function () {
    // Create an auction
    await reverseDutchAuction
      .connect(seller)
      .createAuction(mockToken.address, ethers.utils.parseEther("10"), 60, 100);

    const auctionId = 1;
    const currentPrice = await reverseDutchAuction.getCurrentPrice(auctionId);

    // Get balances before the auction
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

    // Finalize the auction
    await reverseDutchAuction.connect(buyer).finalizeAuction(auctionId, {
      value: currentPrice,
    });

    // Get balances after the auction
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);

    // Verify that the seller received the correct amount
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(currentPrice);

    // Verify that the buyer paid the correct amount
    expect(buyerBalanceBefore.sub(buyerBalanceAfter)).to.equal(currentPrice);
  });

  it("Should handle edge cases (e.g., no buyer before auction ends)", async function () {
    // Create an auction
    await reverseDutchAuction
      .connect(seller)
      .createAuction(mockToken.address, ethers.utils.parseEther("10"), 60, 100);

    const auctionId = 1;

    // Fast-forward time past the auction duration
    await ethers.provider.send("evm_increaseTime", [70]);
    await ethers.provider.send("evm_mine", []);

    // Check that the price is now zero
    const currentPrice = await reverseDutchAuction.getCurrentPrice(auctionId);
    expect(currentPrice).to.equal(0);

    // Withdraw unsold tokens as the seller
    await reverseDutchAuction.connect(seller).withdrawUnsoldTokens(auctionId);

    // Verify that the seller got their token back
    const sellerTokenBalance = await mockToken.balanceOf(seller.address);
    expect(sellerTokenBalance).to.equal(1);
  });
});