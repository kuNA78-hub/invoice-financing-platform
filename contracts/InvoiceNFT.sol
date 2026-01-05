// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract InvoiceNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct InvoiceDetails {
        address msmeAddress;
        address buyerAddress;
        uint256 invoiceAmount;
        uint256 dueDate;
        string invoiceDocumentHash;
        string invoiceNumber;
        string description;
        bool isFinanced;
        bool isSettled;
        uint256 riskScore;
        uint256 createdAt;
    }

    mapping(uint256 => InvoiceDetails) private _invoiceDetails;

    event InvoiceCreated(uint256 indexed tokenId, address msme, address buyer, uint256 amount);
    event InvoiceFinanced(uint256 indexed tokenId);
    event InvoiceSettled(uint256 indexed tokenId);

    constructor() ERC721("InvoiceNFT", "INV") {}

    function createInvoice(
        address buyerAddress,
        uint256 invoiceAmount,
        uint256 dueDate,
        string memory invoiceDocumentHash,
        string memory invoiceNumber,
        string memory description,
        uint256 riskScore
    ) external returns (uint256) {
        require(dueDate > block.timestamp, "Due date must be in the future");
        require(invoiceAmount > 0, "Invoice amount must be greater than 0");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(msg.sender, tokenId);

        _invoiceDetails[tokenId] = InvoiceDetails({
            msmeAddress: msg.sender,
            buyerAddress: buyerAddress,
            invoiceAmount: invoiceAmount,
            dueDate: dueDate,
            invoiceDocumentHash: invoiceDocumentHash,
            invoiceNumber: invoiceNumber,
            description: description,
            isFinanced: false,
            isSettled: false,
            riskScore: riskScore,
            createdAt: block.timestamp
        });

        // Use a different variable name to avoid shadowing
        string memory tokenURIValue = string(abi.encodePacked(
            "https://ipfs.io/ipfs/",
            invoiceDocumentHash
        ));

        _setTokenURI(tokenId, tokenURIValue);

        emit InvoiceCreated(tokenId, msg.sender, buyerAddress, invoiceAmount);
        return tokenId;
    }

    function getInvoiceDetails(uint256 tokenId) external view returns (
        address msmeAddress,
        address buyerAddress,
        uint256 invoiceAmount,
        uint256 dueDate,
        string memory invoiceDocumentHash,
        string memory invoiceNumber,
        string memory description,
        bool isFinanced,
        bool isSettled,
        uint256 riskScore,
        uint256 createdAt
    ) {
        InvoiceDetails memory details = _invoiceDetails[tokenId];
        return (
            details.msmeAddress,
            details.buyerAddress,
            details.invoiceAmount,
            details.dueDate,
            details.invoiceDocumentHash,
            details.invoiceNumber,
            details.description,
            details.isFinanced,
            details.isSettled,
            details.riskScore,
            details.createdAt
        );
    }

    function markAsFinanced(uint256 tokenId) external {
        require(_exists(tokenId), "Token does not exist");
        require(!_invoiceDetails[tokenId].isFinanced, "Already financed");
        require(!_invoiceDetails[tokenId].isSettled, "Already settled");

        _invoiceDetails[tokenId].isFinanced = true;
        emit InvoiceFinanced(tokenId);
    }

    function markAsSettled(uint256 tokenId) external {
        require(_exists(tokenId), "Token does not exist");
        require(_invoiceDetails[tokenId].isFinanced, "Not financed yet");
        require(!_invoiceDetails[tokenId].isSettled, "Already settled");

        _invoiceDetails[tokenId].isSettled = true;
        emit InvoiceSettled(tokenId);
    }

    // Required override for ERC721URIStorage
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Optional: Add a getter for total supply
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
}