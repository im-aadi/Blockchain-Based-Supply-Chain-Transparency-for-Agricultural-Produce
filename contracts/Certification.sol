// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Certification is Ownable, ReentrancyGuard {
    enum CertificationType {
        Organic,
        FairTrade,
        NonGMO,
        Local,
        Sustainable,
        RainforestAlliance,
        USDAOrganic,
        EUOrganic
    }
    
    struct Certificate {
        uint256 id;
        uint256 productId;
        CertificationType certType;
        address certifier;
        string certNumber;
        uint256 issuedDate;
        uint256 expiryDate;
        string description;
        string standards;
        bool isActive;
        bool isRevoked;
        uint256 createdAt;
    }
    
    struct Certifier {
        address wallet;
        string name;
        string organization;
        string licenseNumber;
        bool isAuthorized;
        uint256 registeredAt;
        mapping(CertificationType => bool) authorizedTypes;
    }
    
    mapping(uint256 => Certificate) public certificates;
    mapping(uint256 => uint256[]) public productCertificates;
    mapping(address => Certifier) public certifiers;
    mapping(CertificationType => string) public certificationStandards;
    mapping(string => bool) public usedCertNumbers;
    
    uint256 public certificateCounter;
    uint256 public totalCertificates;
    
    event CertificateIssued(
        uint256 indexed certificateId,
        uint256 indexed productId,
        CertificationType certType,
        address indexed certifier,
        uint256 issuedDate,
        uint256 expiryDate
    );
    
    event CertificateRevoked(
        uint256 indexed certificateId,
        address indexed revoker,
        string reason
    );
    
    event CertifierRegistered(
        address indexed certifier,
        string name,
        string organization,
        uint256 timestamp
    );
    
    event CertifierAuthorized(
        address indexed certifier,
        CertificationType certType,
        bool authorized
    );
    
    modifier onlyCertifier() {
        require(certifiers[msg.sender].isAuthorized, "Only authorized certifiers can perform this action");
        _;
    }
    
    modifier certificateExists(uint256 _certificateId) {
        require(certificates[_certificateId].id != 0, "Certificate does not exist");
        _;
    }
    
    modifier notExpired(uint256 _certificateId) {
        require(certificates[_certificateId].expiryDate > block.timestamp, "Certificate has expired");
        _;
    }
    
    constructor() {
        // Initialize certification standards
        certificationStandards[CertificationType.Organic] = "USDA Organic Standards";
        certificationStandards[CertificationType.FairTrade] = "Fair Trade USA Standards";
        certificationStandards[CertificationType.NonGMO] = "Non-GMO Project Standards";
        certificationStandards[CertificationType.Local] = "Local Sourcing Standards";
        certificationStandards[CertificationType.Sustainable] = "Sustainable Agriculture Standards";
        certificationStandards[CertificationType.RainforestAlliance] = "Rainforest Alliance Standards";
        certificationStandards[CertificationType.USDAOrganic] = "USDA Organic Standards";
        certificationStandards[CertificationType.EUOrganic] = "EU Organic Standards";
    }
    
    function registerCertifier(
        string memory _name,
        string memory _organization,
        string memory _licenseNumber
    ) external {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_organization).length > 0, "Organization cannot be empty");
        require(bytes(_licenseNumber).length > 0, "License number cannot be empty");
        require(certifiers[msg.sender].wallet == address(0), "Certifier already registered");
        
        certifiers[msg.sender] = Certifier({
            wallet: msg.sender,
            name: _name,
            organization: _organization,
            licenseNumber: _licenseNumber,
            isAuthorized: false,
            registeredAt: block.timestamp
        });
        
        emit CertifierRegistered(msg.sender, _name, _organization, block.timestamp);
    }
    
    function authorizeCertifier(
        address _certifier,
        CertificationType _certType,
        bool _authorized
    ) external onlyOwner {
        require(certifiers[_certifier].wallet != address(0), "Certifier not registered");
        
        certifiers[_certifier].authorizedTypes[_certType] = _authorized;
        
        // Check if certifier has any authorized types
        bool hasAnyAuthorization = false;
        for (uint8 i = 0; i < 8; i++) {
            if (certifiers[_certifier].authorizedTypes[CertificationType(i)]) {
                hasAnyAuthorization = true;
                break;
            }
        }
        certifiers[_certifier].isAuthorized = hasAnyAuthorization;
        
        emit CertifierAuthorized(_certifier, _certType, _authorized);
    }
    
    function issueCertificate(
        uint256 _productId,
        CertificationType _certType,
        string memory _certNumber,
        uint256 _expiryDate,
        string memory _description,
        string memory _standards
    ) external onlyCertifier nonReentrant {
        require(_productId > 0, "Invalid product ID");
        require(bytes(_certNumber).length > 0, "Certificate number cannot be empty");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(!usedCertNumbers[_certNumber], "Certificate number already used");
        require(certifiers[msg.sender].authorizedTypes[_certType], "Not authorized for this certification type");
        
        certificateCounter++;
        
        Certificate memory newCertificate = Certificate({
            id: certificateCounter,
            productId: _productId,
            certType: _certType,
            certifier: msg.sender,
            certNumber: _certNumber,
            issuedDate: block.timestamp,
            expiryDate: _expiryDate,
            description: _description,
            standards: _standards,
            isActive: true,
            isRevoked: false,
            createdAt: block.timestamp
        });
        
        certificates[certificateCounter] = newCertificate;
        productCertificates[_productId].push(certificateCounter);
        usedCertNumbers[_certNumber] = true;
        totalCertificates++;
        
        emit CertificateIssued(
            certificateCounter,
            _productId,
            _certType,
            msg.sender,
            block.timestamp,
            _expiryDate
        );
    }
    
    function revokeCertificate(
        uint256 _certificateId,
        string memory _reason
    ) external onlyCertifier certificateExists(_certificateId) {
        require(certificates[_certificateId].certifier == msg.sender || msg.sender == owner(), 
                "Only the issuing certifier or owner can revoke");
        require(!certificates[_certificateId].isRevoked, "Certificate already revoked");
        require(bytes(_reason).length > 0, "Reason for revocation required");
        
        certificates[_certificateId].isRevoked = true;
        certificates[_certificateId].isActive = false;
        
        emit CertificateRevoked(_certificateId, msg.sender, _reason);
    }
    
    function getCertificate(uint256 _certificateId) external view returns (Certificate memory) {
        require(certificates[_certificateId].id != 0, "Certificate does not exist");
        return certificates[_certificateId];
    }
    
    function getProductCertificates(uint256 _productId) external view returns (uint256[] memory) {
        return productCertificates[_productId];
    }
    
    function getActiveCertificates(uint256 _productId) external view returns (uint256[] memory) {
        uint256[] memory certs = productCertificates[_productId];
        uint256[] memory activeCerts = new uint256[](certs.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < certs.length; i++) {
            if (certificates[certs[i]].isActive && 
                !certificates[certs[i]].isRevoked && 
                certificates[certs[i]].expiryDate > block.timestamp) {
                activeCerts[activeCount] = certs[i];
                activeCount++;
            }
        }
        
        // Resize array to actual active count
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeCerts[i];
        }
        
        return result;
    }
    
    function verifyCertificate(uint256 _certificateId) external view returns (
        bool isValid,
        bool isActive,
        bool isExpired,
        bool isRevoked
    ) {
        require(certificates[_certificateId].id != 0, "Certificate does not exist");
        
        Certificate memory cert = certificates[_certificateId];
        bool expired = cert.expiryDate <= block.timestamp;
        
        return (
            true, // Certificate exists, so it's valid
            cert.isActive,
            expired,
            cert.isRevoked
        );
    }
    
    function getCertifier(address _certifier) external view returns (
        string memory name,
        string memory organization,
        string memory licenseNumber,
        bool isAuthorized,
        uint256 registeredAt
    ) {
        require(certifiers[_certifier].wallet != address(0), "Certifier not found");
        
        Certifier storage certifier = certifiers[_certifier];
        return (
            certifier.name,
            certifier.organization,
            certifier.licenseNumber,
            certifier.isAuthorized,
            certifier.registeredAt
        );
    }
    
    function getCertificationStandards(CertificationType _certType) external view returns (string memory) {
        return certificationStandards[_certType];
    }
    
    function getTotalCertificates() external view returns (uint256) {
        return totalCertificates;
    }
    
    function getCertificatesByType(CertificationType _certType) external view returns (uint256[] memory) {
        uint256[] memory typeCerts = new uint256[](totalCertificates);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= certificateCounter; i++) {
            if (certificates[i].certType == _certType) {
                typeCerts[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = typeCerts[i];
        }
        
        return result;
    }
}
