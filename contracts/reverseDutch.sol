// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ReverseDutchAuction {
    struct Auction {
        address seller;
        IERC20 token;
        uint256 initialPrice;
        uint256 duration;
        uint256 priceDecreaseRate; // Price decrease per second
        uint256 startTime;
        bool isFinalized;
    }

    mapping(uint256 => Auction) public auctions;
    uint256 public auctionCount;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address token,
        uint256 initialPrice,
        uint256 duration,
        uint256 priceDecreaseRate
    );

    event AuctionFinalized(
        uint256 indexed auctionId,
        address indexed buyer,
        uint256 finalPrice
    );

    constructor() {}

    function createAuction(
        IERC20 _token,
        uint256 _initialPrice,
        uint256 _duration,
        uint256 _priceDecreaseRate
    ) external {
        require(_duration > 0, "Duration must be greater than 0");
        require(_priceDecreaseRate > 0, "Price decrease rate must be greater than 0");

        uint256 auctionId = ++auctionCount;
        auctions[auctionId] = Auction({
            seller: msg.sender,
            token: _token,
            initialPrice: _initialPrice,
            duration: _duration,
            priceDecreaseRate: _priceDecreaseRate,
            startTime: block.timestamp,
            isFinalized: false
        });

        emit AuctionCreated(
            auctionId,
            msg.sender,
            address(_token),
            _initialPrice,
            _duration,
            _priceDecreaseRate
        );
    }

    function getCurrentPrice(uint256 _auctionId) public view returns (uint256) {
        Auction memory auction = auctions[_auctionId];
        require(!auction.isFinalized, "Auction already finalized");
        uint256 elapsedTime = block.timestamp - auction.startTime;
        if (elapsedTime >= auction.duration) {
            return 0; 
        }
        return auction.initialPrice - (elapsedTime * auction.priceDecreaseRate);
    }

    function finalizeAuction(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        require(!auction.isFinalized, "Auction already finalized");
        require(block.timestamp <= auction.startTime + auction.duration, "Auction expired");

        uint256 currentPrice = getCurrentPrice(_auctionId);
        require(currentPrice > 0, "Auction price is zero");

        require(msg.value >= currentPrice, "Insufficient funds");

        // Transfer tokens from seller to buyer
        auction.token.transferFrom(auction.seller, msg.sender, 1);


        (bool sent, ) = payable(auction.seller).call{value: currentPrice}("");
        require(sent, "Failed to send Ether");

        // Refund excess amount 
        if (msg.value > currentPrice) {
            payable(msg.sender).transfer(msg.value - currentPrice);
        }

        auction.isFinalized = true;

        emit AuctionFinalized(_auctionId, msg.sender, currentPrice);
    }

    function withdrawUnsoldTokens(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(auction.seller == msg.sender, "Not the seller");
        require(!auction.isFinalized, "Auction already finalized");
        require(block.timestamp > auction.startTime + auction.duration, "Auction not expired");

        auction.token.transfer(auction.seller, 1); 
    }
}