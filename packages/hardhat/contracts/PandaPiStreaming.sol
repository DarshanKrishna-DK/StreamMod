// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PandaPiStreaming
 * @dev Smart contract for PandaPi decentralized streaming platform on Avalanche
 * Handles user registration, stream management, moderator payments, and revenue sharing
 */
contract PandaPiStreaming is Ownable, ReentrancyGuard {
    
    // Events
    event UserRegistered(address indexed user, string profileHash);
    event StreamCreated(uint256 indexed streamId, address indexed streamer, string title);
    event StreamEnded(uint256 indexed streamId, uint256 duration, uint256 earnings);
    event ModeratorCreated(uint256 indexed moderatorId, address indexed creator, string moderatorType);
    event ModeratorPayment(uint256 indexed moderatorId, address indexed streamer, uint256 amount);
    event RevenueWithdrawn(address indexed user, uint256 amount);
    
    // Structs
    struct User {
        address walletAddress;
        string profileHash; // IPFS hash containing user profile data
        uint256 totalStreams;
        uint256 totalEarnings;
        uint256 totalSpent;
        bool isRegistered;
        uint256 registeredAt;
    }
    
    struct Stream {
        uint256 id;
        address streamer;
        string title;
        string category;
        string metadataHash; // IPFS hash containing stream metadata
        uint256 startTime;
        uint256 endTime;
        uint256 totalEarnings;
        uint256 peakViewers;
        bool isActive;
        uint256[] moderatorIds;
    }
    
    struct Moderator {
        uint256 id;
        address creator;
        string moderatorType;
        string configHash; // IPFS hash containing moderator configuration
        uint256 pricePerHour; // Price in wei
        uint256 totalUsage; // Total hours used
        uint256 totalEarnings;
        bool isActive;
        uint256 createdAt;
    }
    
    struct ModeratorUsage {
        uint256 moderatorId;
        uint256 streamId;
        uint256 startTime;
        uint256 endTime;
        uint256 cost;
        bool isPaid;
    }
    
    // State variables
    mapping(address => User) public users;
    mapping(uint256 => Stream) public streams;
    mapping(uint256 => Moderator) public moderators;
    mapping(uint256 => ModeratorUsage) public moderatorUsages;
    mapping(address => uint256) public userBalances;
    
    uint256 public nextStreamId = 1;
    uint256 public nextModeratorId = 1;
    uint256 public nextUsageId = 1;
    
    uint256 public platformFeePercentage = 250; // 2.5% (250 basis points)
    uint256 public constant BASIS_POINTS = 10000;
    
    address public feeRecipient;
    
    // Modifiers
    modifier onlyRegisteredUser() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }
    
    modifier validStream(uint256 _streamId) {
        require(_streamId > 0 && _streamId < nextStreamId, "Invalid stream ID");
        _;
    }
    
    modifier validModerator(uint256 _moderatorId) {
        require(_moderatorId > 0 && _moderatorId < nextModeratorId, "Invalid moderator ID");
        _;
    }
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Register a new user on the platform
     * @param _profileHash IPFS hash containing user profile data
     */
    function registerUser(string memory _profileHash) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        require(bytes(_profileHash).length > 0, "Profile hash cannot be empty");
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            profileHash: _profileHash,
            totalStreams: 0,
            totalEarnings: 0,
            totalSpent: 0,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        
        emit UserRegistered(msg.sender, _profileHash);
    }
    
    /**
     * @dev Update user profile
     * @param _profileHash New IPFS hash containing updated profile data
     */
    function updateUserProfile(string memory _profileHash) external onlyRegisteredUser {
        require(bytes(_profileHash).length > 0, "Profile hash cannot be empty");
        users[msg.sender].profileHash = _profileHash;
    }
    
    /**
     * @dev Create a new stream
     * @param _title Stream title
     * @param _category Stream category
     * @param _metadataHash IPFS hash containing stream metadata
     * @param _moderatorIds Array of moderator IDs to use for this stream
     */
    function createStream(
        string memory _title,
        string memory _category,
        string memory _metadataHash,
        uint256[] memory _moderatorIds
    ) external onlyRegisteredUser returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_category).length > 0, "Category cannot be empty");
        
        uint256 streamId = nextStreamId++;
        
        streams[streamId] = Stream({
            id: streamId,
            streamer: msg.sender,
            title: _title,
            category: _category,
            metadataHash: _metadataHash,
            startTime: block.timestamp,
            endTime: 0,
            totalEarnings: 0,
            peakViewers: 0,
            isActive: true,
            moderatorIds: _moderatorIds
        });
        
        users[msg.sender].totalStreams++;
        
        emit StreamCreated(streamId, msg.sender, _title);
        return streamId;
    }
    
    /**
     * @dev End a stream and calculate moderator costs
     * @param _streamId ID of the stream to end
     * @param _peakViewers Peak number of viewers during the stream
     */
    function endStream(uint256 _streamId, uint256 _peakViewers) 
        external 
        validStream(_streamId) 
        onlyRegisteredUser 
    {
        Stream storage stream = streams[_streamId];
        require(stream.streamer == msg.sender, "Only streamer can end their stream");
        require(stream.isActive, "Stream already ended");
        
        stream.endTime = block.timestamp;
        stream.isActive = false;
        stream.peakViewers = _peakViewers;
        
        // Calculate moderator costs
        uint256 duration = stream.endTime - stream.startTime;
        uint256 totalCost = 0;
        
        for (uint256 i = 0; i < stream.moderatorIds.length; i++) {
            uint256 moderatorId = stream.moderatorIds[i];
            Moderator storage moderator = moderators[moderatorId];
            
            if (moderator.isActive) {
                uint256 cost = (moderator.pricePerHour * duration) / 3600; // Convert to hourly rate
                totalCost += cost;
                
                // Record usage
                moderatorUsages[nextUsageId++] = ModeratorUsage({
                    moderatorId: moderatorId,
                    streamId: _streamId,
                    startTime: stream.startTime,
                    endTime: stream.endTime,
                    cost: cost,
                    isPaid: false
                });
            }
        }
        
        stream.totalEarnings = totalCost;
        users[msg.sender].totalSpent += totalCost;
        
        emit StreamEnded(_streamId, duration, totalCost);
    }
    
    /**
     * @dev Create a new AI moderator
     * @param _moderatorType Type of moderator (e.g., "toxicity-guardian")
     * @param _configHash IPFS hash containing moderator configuration
     * @param _pricePerHour Price per hour in wei
     */
    function createModerator(
        string memory _moderatorType,
        string memory _configHash,
        uint256 _pricePerHour
    ) external onlyRegisteredUser returns (uint256) {
        require(bytes(_moderatorType).length > 0, "Moderator type cannot be empty");
        require(_pricePerHour > 0, "Price must be greater than 0");
        
        uint256 moderatorId = nextModeratorId++;
        
        moderators[moderatorId] = Moderator({
            id: moderatorId,
            creator: msg.sender,
            moderatorType: _moderatorType,
            configHash: _configHash,
            pricePerHour: _pricePerHour,
            totalUsage: 0,
            totalEarnings: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit ModeratorCreated(moderatorId, msg.sender, _moderatorType);
        return moderatorId;
    }
    
    /**
     * @dev Pay for moderator usage
     * @param _usageId ID of the moderator usage to pay for
     */
    function payModeratorUsage(uint256 _usageId) external payable nonReentrant {
        ModeratorUsage storage usage = moderatorUsages[_usageId];
        require(!usage.isPaid, "Usage already paid");
        require(msg.value >= usage.cost, "Insufficient payment");
        
        Stream storage stream = streams[usage.streamId];
        require(stream.streamer == msg.sender, "Only streamer can pay for their usage");
        
        usage.isPaid = true;
        
        Moderator storage moderator = moderators[usage.moderatorId];
        moderator.totalUsage += (usage.endTime - usage.startTime);
        moderator.totalEarnings += usage.cost;
        
        // Calculate platform fee
        uint256 platformFee = (usage.cost * platformFeePercentage) / BASIS_POINTS;
        uint256 creatorEarnings = usage.cost - platformFee;
        
        // Update balances
        userBalances[moderator.creator] += creatorEarnings;
        userBalances[feeRecipient] += platformFee;
        
        // Refund excess payment
        if (msg.value > usage.cost) {
            payable(msg.sender).transfer(msg.value - usage.cost);
        }
        
        emit ModeratorPayment(usage.moderatorId, msg.sender, usage.cost);
    }
    
    /**
     * @dev Withdraw earnings from the platform
     */
    function withdrawEarnings() external nonReentrant {
        uint256 balance = userBalances[msg.sender];
        require(balance > 0, "No earnings to withdraw");
        
        userBalances[msg.sender] = 0;
        users[msg.sender].totalEarnings += balance;
        
        payable(msg.sender).transfer(balance);
        
        emit RevenueWithdrawn(msg.sender, balance);
    }
    
    /**
     * @dev Get user information
     * @param _user Address of the user
     */
    function getUser(address _user) external view returns (User memory) {
        return users[_user];
    }
    
    /**
     * @dev Get stream information
     * @param _streamId ID of the stream
     */
    function getStream(uint256 _streamId) external view validStream(_streamId) returns (Stream memory) {
        return streams[_streamId];
    }
    
    /**
     * @dev Get moderator information
     * @param _moderatorId ID of the moderator
     */
    function getModerator(uint256 _moderatorId) external view validModerator(_moderatorId) returns (Moderator memory) {
        return moderators[_moderatorId];
    }
    
    /**
     * @dev Get user's available balance
     * @param _user Address of the user
     */
    function getUserBalance(address _user) external view returns (uint256) {
        return userBalances[_user];
    }
    
    /**
     * @dev Get moderator usage information
     * @param _usageId ID of the usage record
     */
    function getModeratorUsage(uint256 _usageId) external view returns (ModeratorUsage memory) {
        return moderatorUsages[_usageId];
    }
    
    /**
     * @dev Update platform fee (only owner)
     * @param _newFeePercentage New fee percentage in basis points
     */
    function updatePlatformFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFeePercentage = _newFeePercentage;
    }
    
    /**
     * @dev Update fee recipient (only owner)
     * @param _newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _newFeeRecipient;
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
