// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ProductRegistry is Ownable, ReentrancyGuard {
    struct Product {
        uint256 id;
        string name;
        string category;
        string variety;
        address farmer;
        uint256 harvestDate;
        string location;
        string coordinates;
        bool isOrganic;
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct QualityCheck {
        uint256 productId;
        address inspector;
        uint256 timestamp;
        uint8 qualityScore; // 1-10 scale
        string notes;
        bool passed;
    }

    mapping(uint256 => Product) public products;
    mapping(uint256 => QualityCheck[]) public qualityChecks;
    mapping(address => uint256[]) public farmerProducts;
    mapping(string => bool) public productNames;
    
    uint256 public productCounter;
    uint256 public totalProducts;
    
    event ProductRegistered(
        uint256 indexed productId,
        address indexed farmer,
        string name,
        string category,
        uint256 harvestDate
    );
    
    event QualityCheckAdded(
        uint256 indexed productId,
        address indexed inspector,
        uint8 qualityScore,
        bool passed
    );
    
    event ProductVerified(uint256 indexed productId, bool verified);
    
    modifier onlyFarmer(uint256 _productId) {
        require(products[_productId].farmer == msg.sender, "Only the farmer can perform this action");
        _;
    }
    
    modifier productExists(uint256 _productId) {
        require(products[_productId].id != 0, "Product does not exist");
        _;
    }
    
    function registerProduct(
        string memory _name,
        string memory _category,
        string memory _variety,
        uint256 _harvestDate,
        string memory _location,
        string memory _coordinates,
        bool _isOrganic
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(bytes(_category).length > 0, "Category cannot be empty");
        require(_harvestDate <= block.timestamp, "Harvest date cannot be in the future");
        
        productCounter++;
        
        Product memory newProduct = Product({
            id: productCounter,
            name: _name,
            category: _category,
            variety: _variety,
            farmer: msg.sender,
            harvestDate: _harvestDate,
            location: _location,
            coordinates: _coordinates,
            isOrganic: _isOrganic,
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        products[productCounter] = newProduct;
        farmerProducts[msg.sender].push(productCounter);
        totalProducts++;
        
        emit ProductRegistered(
            productCounter,
            msg.sender,
            _name,
            _category,
            _harvestDate
        );
        
        return productCounter;
    }
    
    function getProduct(uint256 _productId) external view returns (Product memory) {
        require(products[_productId].id != 0, "Product does not exist");
        return products[_productId];
    }
    
    function addQualityCheck(
        uint256 _productId,
        uint8 _qualityScore,
        string memory _notes
    ) external productExists(_productId) {
        require(_qualityScore >= 1 && _qualityScore <= 10, "Quality score must be between 1 and 10");
        require(bytes(_notes).length > 0, "Notes cannot be empty");
        
        bool passed = _qualityScore >= 7; // Minimum quality score of 7 to pass
        
        QualityCheck memory newCheck = QualityCheck({
            productId: _productId,
            inspector: msg.sender,
            timestamp: block.timestamp,
            qualityScore: _qualityScore,
            notes: _notes,
            passed: passed
        });
        
        qualityChecks[_productId].push(newCheck);
        
        // Update product verification status if quality check passes
        if (passed && !products[_productId].isVerified) {
            products[_productId].isVerified = true;
            products[_productId].updatedAt = block.timestamp;
            emit ProductVerified(_productId, true);
        }
        
        emit QualityCheckAdded(_productId, msg.sender, _qualityScore, passed);
    }
    
    function getQualityChecks(uint256 _productId) external view returns (QualityCheck[] memory) {
        require(products[_productId].id != 0, "Product does not exist");
        return qualityChecks[_productId];
    }
    
    function getFarmerProducts(address _farmer) external view returns (uint256[] memory) {
        return farmerProducts[_farmer];
    }
    
    function updateProductLocation(
        uint256 _productId,
        string memory _newLocation,
        string memory _newCoordinates
    ) external onlyFarmer(_productId) productExists(_productId) {
        products[_productId].location = _newLocation;
        products[_productId].coordinates = _newCoordinates;
        products[_productId].updatedAt = block.timestamp;
    }
    
    function verifyProduct(uint256 _productId) external onlyOwner productExists(_productId) {
        products[_productId].isVerified = true;
        products[_productId].updatedAt = block.timestamp;
        emit ProductVerified(_productId, true);
    }
    
    function getTotalProducts() external view returns (uint256) {
        return totalProducts;
    }
    
    function getProductCountByCategory(string memory _category) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= productCounter; i++) {
            if (keccak256(bytes(products[i].category)) == keccak256(bytes(_category))) {
                count++;
            }
        }
        return count;
    }
    
    function getVerifiedProducts() external view returns (uint256[] memory) {
        uint256[] memory verifiedProducts = new uint256[](totalProducts);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= productCounter; i++) {
            if (products[i].isVerified) {
                verifiedProducts[index] = i;
                index++;
            }
        }
        
        return verifiedProducts;
    }
}
