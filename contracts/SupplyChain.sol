// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SupplyChain is Ownable, ReentrancyGuard {
    enum ProductStatus {
        Harvested,
        Processed,
        Packaged,
        InTransit,
        AtWarehouse,
        AtRetailer,
        Delivered,
        Consumed
    }
    
    struct Transfer {
        uint256 productId;
        address from;
        address to;
        ProductStatus fromStatus;
        ProductStatus toStatus;
        uint256 timestamp;
        string location;
        string notes;
        uint256 temperature; // in Celsius
        uint256 humidity; // percentage
    }
    
    struct Stakeholder {
        address wallet;
        string name;
        string role;
        string location;
        bool isActive;
        uint256 registeredAt;
    }
    
    mapping(uint256 => Transfer[]) public productTransfers;
    mapping(uint256 => ProductStatus) public currentStatus;
    mapping(uint256 => address) public currentOwner;
    mapping(address => Stakeholder) public stakeholders;
    mapping(string => bool) public registeredRoles;
    
    uint256 public transferCounter;
    uint256 public totalTransfers;
    
    event TransferCreated(
        uint256 indexed transferId,
        uint256 indexed productId,
        address indexed from,
        address to,
        ProductStatus fromStatus,
        ProductStatus toStatus,
        uint256 timestamp
    );
    
    event StakeholderRegistered(
        address indexed stakeholder,
        string name,
        string role,
        uint256 timestamp
    );
    
    event ProductStatusUpdated(
        uint256 indexed productId,
        ProductStatus newStatus,
        address currentOwner,
        uint256 timestamp
    );
    
    modifier onlyStakeholder() {
        require(stakeholders[msg.sender].isActive, "Only registered stakeholders can perform this action");
        _;
    }
    
    modifier validStatusTransition(ProductStatus _from, ProductStatus _to) {
        require(isValidTransition(_from, _to), "Invalid status transition");
        _;
    }
    
    function registerStakeholder(
        string memory _name,
        string memory _role,
        string memory _location
    ) external {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_role).length > 0, "Role cannot be empty");
        require(!stakeholders[msg.sender].isActive, "Stakeholder already registered");
        
        stakeholders[msg.sender] = Stakeholder({
            wallet: msg.sender,
            name: _name,
            role: _role,
            location: _location,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        registeredRoles[_role] = true;
        
        emit StakeholderRegistered(msg.sender, _name, _role, block.timestamp);
    }
    
    function createTransfer(
        uint256 _productId,
        address _to,
        ProductStatus _toStatus,
        string memory _location,
        string memory _notes,
        uint256 _temperature,
        uint256 _humidity
    ) external onlyStakeholder nonReentrant {
        require(_to != address(0), "Invalid recipient address");
        require(currentOwner[_productId] == msg.sender, "Only current owner can transfer");
        require(_to != msg.sender, "Cannot transfer to self");
        require(stakeholders[_to].isActive, "Recipient must be a registered stakeholder");
        
        ProductStatus fromStatus = currentStatus[_productId];
        require(isValidTransition(fromStatus, _toStatus), "Invalid status transition");
        
        transferCounter++;
        
        Transfer memory newTransfer = Transfer({
            productId: _productId,
            from: msg.sender,
            to: _to,
            fromStatus: fromStatus,
            toStatus: _toStatus,
            timestamp: block.timestamp,
            location: _location,
            notes: _notes,
            temperature: _temperature,
            humidity: _humidity
        });
        
        productTransfers[_productId].push(newTransfer);
        currentStatus[_productId] = _toStatus;
        currentOwner[_productId] = _to;
        totalTransfers++;
        
        emit TransferCreated(
            transferCounter,
            _productId,
            msg.sender,
            _to,
            fromStatus,
            _toStatus,
            block.timestamp
        );
        
        emit ProductStatusUpdated(_productId, _toStatus, _to, block.timestamp);
    }
    
    function getProductTransfers(uint256 _productId) external view returns (Transfer[] memory) {
        return productTransfers[_productId];
    }
    
    function getProductHistory(uint256 _productId) external view returns (
        Transfer[] memory,
        ProductStatus currentProductStatus,
        address currentProductOwner
    ) {
        return (
            productTransfers[_productId],
            currentStatus[_productId],
            currentOwner[_productId]
        );
    }
    
    function getStakeholder(address _stakeholder) external view returns (Stakeholder memory) {
        require(stakeholders[_stakeholder].isActive, "Stakeholder not found");
        return stakeholders[_stakeholder];
    }
    
    function updateProductStatus(
        uint256 _productId,
        ProductStatus _newStatus,
        string memory _location,
        string memory _notes
    ) external onlyStakeholder {
        require(currentOwner[_productId] == msg.sender, "Only current owner can update status");
        require(isValidTransition(currentStatus[_productId], _newStatus), "Invalid status transition");
        
        currentStatus[_productId] = _newStatus;
        
        emit ProductStatusUpdated(_productId, _newStatus, msg.sender, block.timestamp);
    }
    
    function isValidTransition(ProductStatus _from, ProductStatus _to) internal pure returns (bool) {
        if (_from == ProductStatus.Harvested) {
            return _to == ProductStatus.Processed;
        } else if (_from == ProductStatus.Processed) {
            return _to == ProductStatus.Packaged;
        } else if (_from == ProductStatus.Packaged) {
            return _to == ProductStatus.InTransit || _to == ProductStatus.AtWarehouse;
        } else if (_from == ProductStatus.InTransit) {
            return _to == ProductStatus.AtWarehouse || _to == ProductStatus.AtRetailer || _to == ProductStatus.Delivered;
        } else if (_from == ProductStatus.AtWarehouse) {
            return _to == ProductStatus.InTransit || _to == ProductStatus.AtRetailer;
        } else if (_from == ProductStatus.AtRetailer) {
            return _to == ProductStatus.Delivered;
        } else if (_from == ProductStatus.Delivered) {
            return _to == ProductStatus.Consumed;
        }
        return false;
    }
    
    function getProductsByStakeholder(address _stakeholder) external view returns (uint256[] memory) {
        uint256[] memory ownedProducts = new uint256[](1000); // Assuming max 1000 products per stakeholder
        uint256 count = 0;
        
        // This would need to be optimized with additional mappings in a real implementation
        // For now, this is a simplified version
        return ownedProducts;
    }
    
    function getTotalTransfers() external view returns (uint256) {
        return totalTransfers;
    }
    
    function getStakeholdersByRole(string memory _role) external view returns (address[] memory) {
        // This would require additional storage in a real implementation
        // For now, returning empty array
        address[] memory roleStakeholders = new address[](0);
        return roleStakeholders;
    }
    
    function deactivateStakeholder(address _stakeholder) external onlyOwner {
        require(stakeholders[_stakeholder].isActive, "Stakeholder not active");
        stakeholders[_stakeholder].isActive = false;
    }
    
    function activateStakeholder(address _stakeholder) external onlyOwner {
        require(stakeholders[_stakeholder].wallet != address(0), "Stakeholder not registered");
        stakeholders[_stakeholder].isActive = true;
    }
}
