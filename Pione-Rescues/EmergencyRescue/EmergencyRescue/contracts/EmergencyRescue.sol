// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EmergencyRescue
 * @dev Quản lý hồ sơ y tế và quy trình thưởng cứu hộ khẩn cấp.
 */
contract EmergencyRescue is Ownable {

    // =============================================================
    // STRUCTS
    // =============================================================

    struct Profile {
        string name;
        uint256 age;
        string allergies;
        string conditions;
        bool isRegistered; // Quan trọng để kiểm tra
    }

    struct TreatmentLog {
        uint256 timestamp;
        string location;
        string verifierName;
        string details; // Gộp (Tình trạng, Thuốc, Thiết bị)
    }

    // Sử dụng enum để code dễ đọc hơn
    enum EventStatus { Pending, Assigned, Confirmed, Paid }

    struct EmergencyEvent {
        address patientAddress;
        string patientCccd;
        uint256 rewardAmount;
        address[] potentialRescuers;
        address officialRescuerAddress;
        EventStatus status; // 0=Pending, 1=Assigned, 2=Confirmed, 3=Paid
    }

    // =============================================================
    // STATE VARIABLES & MAPPINGS
    // =============================================================

    mapping(string => Profile) public profiles;
    mapping(string => TreatmentLog[]) public treatmentLogs;
    mapping(uint256 => EmergencyEvent) public emergencyEvents;

    uint256 public nextEventId;

    // =============================================================
    // EVENTS
    // =============================================================

    event ProfileCreated(string indexed cccd, string name);
    event TreatmentLogAdded(string indexed cccd);
    event FundsDeposited(address indexed from, uint256 amount);
    event EmergencyEventCreated(uint256 indexed eventId, address indexed patientAddress, string patientCccd, uint256 rewardAmount);
    event RescuerAssigned(uint256 indexed eventId, address indexed rescuerAddress);
    event RescueConfirmed(uint256 indexed eventId, address indexed officialRescuerAddress);
    event PaymentExecuted(uint256 indexed eventId, address indexed officialRescuerAddress, uint256 amount);

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor() Ownable(msg.sender) {}

    // =============================================================
    // FUNCTIONS (ĐÃ ĐIỀN LOGIC)
    // =============================================================

    // --- Nhóm 1: Quản lý Hồ sơ ---

    /**
     * @dev (Hàm 1) Khởi tạo hồ sơ y tế bảo mật bằng CCCD
     */
    function createProfile(
        string memory _cccd,
        string memory _name,
        uint256 _age,
        string memory _allergies,
        string memory _conditions
    ) external {
        require(bytes(_cccd).length > 0, "CCCD cannot be empty");
        require(!profiles[_cccd].isRegistered, "Profile already exists");

        profiles[_cccd] = Profile({
            name: _name,
            age: _age,
            allergies: _allergies,
            conditions: _conditions,
            isRegistered: true
        });

        emit ProfileCreated(_cccd, _name);
    }

    /**
     * @dev (Hàm 2) Thêm một bản ghi lịch sử điều trị vào hồ sơ CCCD
     */
    function addTreatmentLog(
        string memory _cccd,
        string memory _location,
        string memory _verifierName,
        string memory _details
    ) external {
        // (Demo: Ai cũng có thể gọi. Thực tế: nên thêm modifier kiểm tra quyền Provider)
        require(profiles[_cccd].isRegistered, "Profile does not exist");
        
        treatmentLogs[_cccd].push(TreatmentLog({
            timestamp: block.timestamp,
            location: _location,
            verifierName: _verifierName,
            details: _details
        }));

        emit TreatmentLogAdded(_cccd);
    }

    /**
     * @dev (Hàm 3) Truy vấn hồ sơ y tế (Ai cũng xem được trong demo)
     */
    function getMedicalHistory(string memory _cccd)
        external
        view
        returns (Profile memory, TreatmentLog[] memory)
    {
        // Yêu cầu này sẽ tự động báo lỗi "Profile does not exist" nếu không tìm thấy
        require(profiles[_cccd].isRegistered, "Profile does not exist");
        return (profiles[_cccd], treatmentLogs[_cccd]);
    }

    // --- Nhóm 2: Quản lý Quỹ ---

    /**
     * @dev (Hàm 4) Hàm Gây Quỹ: Cho phép bất kỳ ai gửi tiền vào Quỹ thưởng.
     */
    function depositFunds() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev (Hàm 5) Truy vấn Quỹ: Trả về tổng số tiền hiện có.
     */
    function viewFundBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // --- Nhóm 3: Quy trình Khẩn cấp & Thưởng ---

    /**
     * @dev (Hàm 6) Hệ thống/Oracle gọi để tạo sự kiện khẩn cấp
     */
    function createEmergencyEvent(
        address _patientAddress,
        string memory _patientCccd,
        uint256 _rewardAmount
    ) external onlyOwner returns (uint256) {
        require(_patientAddress != address(0), "Invalid patient address");
        require(bytes(_patientCccd).length > 0, "CCCD cannot be empty");
        require(profiles[_patientCccd].isRegistered, "Patient profile does not exist");
        require(_rewardAmount > 0, "Reward must be greater than 0");

        uint256 eventId = nextEventId;

        emergencyEvents[eventId] = EmergencyEvent({
            patientAddress: _patientAddress,
            patientCccd: _patientCccd,
            rewardAmount: _rewardAmount,
            potentialRescuers: new address[](0), // Khởi tạo mảng rỗng
            officialRescuerAddress: address(0),
            status: EventStatus.Pending // Trạng thái 0
        });

        nextEventId++;
        emit EmergencyEventCreated(eventId, _patientAddress, _patientCccd, _rewardAmount);
        return eventId;
    }

    /**
     * @dev (Hàm 7) (Gán Người tiềm năng): Hệ thống gọi để thêm người cứu hộ hợp lệ.
     */
    function assignRescuer(uint256 _eventId, address _rescuerAddress)
        external
        onlyOwner
    {
        // ===== ĐÃ SỬA LỖI: 'event' thành 'evt' =====
        EmergencyEvent storage evt = emergencyEvents[_eventId]; 
        require(evt.patientAddress != address(0), "Event does not exist");
        require(evt.status == EventStatus.Pending || evt.status == EventStatus.Assigned, "Event is not in pending/assigned state");

        // (Tùy chọn: Kiểm tra xem rescuer đã được thêm chưa để tránh trùng lặp)
        evt.potentialRescuers.push(_rescuerAddress);
        evt.status = EventStatus.Assigned; // Trạng thái 1

        emit RescuerAssigned(_eventId, _rescuerAddress);
    }

    /**
     * @dev (Hàm 8) (Xác nhận Cuối cùng): Nạn nhân chọn 1 người từ danh sách.
     */
    function confirmSuccessByPatient(
        uint256 _eventId,
        address _confirmedRescuerAddress
    ) external {
        // ===== ĐÃ SỬA LỖI: 'event' thành 'evt' =====
        EmergencyEvent storage evt = emergencyEvents[_eventId];
        
        // --- KIỂM TRA BẢO MẬT ---
        require(evt.patientAddress != address(0), "Event does not exist");
        require(msg.sender == evt.patientAddress, "Only the patient can confirm");
        require(evt.status == EventStatus.Assigned, "Event is not in assigned state");
        require(evt.officialRescuerAddress == address(0), "Event already confirmed");

        // Kiểm tra xem người được confirm có trong danh sách assign không
        bool isPotentialRescuer = false;
        for (uint i = 0; i < evt.potentialRescuers.length; i++) {
            if (evt.potentialRescuers[i] == _confirmedRescuerAddress) {
                isPotentialRescuer = true;
                break;
            }
        }
        require(isPotentialRescuer, "Rescuer was not assigned by the system");
        // --- KẾT THÚC KIỂM TRA ---

        evt.officialRescuerAddress = _confirmedRescuerAddress;
        evt.status = EventStatus.Confirmed; // Trạng thái 2

        emit RescueConfirmed(_eventId, _confirmedRescuerAddress);
    }

    /**
     * @dev (Hàm 9) (Thực thi Thanh toán): Hệ thống gọi sau khi đã kiểm tra Off-chain.
     */
    function verifyAndExecutePayment(uint256 _eventId) external onlyOwner {
        // ===== ĐÃ SỬA LỖI: 'event' thành 'evt' =====
        EmergencyEvent storage evt = emergencyEvents[_eventId]; // Lỗi của bạn ở dòng này
        
        require(evt.status == EventStatus.Confirmed, "Event not confirmed by patient");
        
        uint256 amount = evt.rewardAmount;
        require(address(this).balance >= amount, "Insufficient funds in contract");

        // Cập nhật trạng thái TRƯỚC khi gửi tiền (Chống tấn công Re-entrancy)
        evt.status = EventStatus.Paid; // Trạng thái 3

        // Gửi tiền
        (bool success, ) = evt.officialRescuerAddress.call{value: amount}("");
        require(success, "Payment failed");

        emit PaymentExecuted(_eventId, evt.officialRescuerAddress, amount);
    }

    /**
     * @dev (Hàm 10) Trả về danh sách những người đã được hệ thống xác minh.
     */
    function viewAssignedRescuers(uint256 _eventId)
        external
        view
        returns (address[] memory)
    {
        return emergencyEvents[_eventId].potentialRescuers;
    }

    /**
     * @dev (Hàm 11) Trả về trạng thái hiện tại và người nhận thưởng chính thức.
     */
    function viewEventStatus(uint256 _eventId)
        external
        view
        returns (EmergencyEvent memory)
    {
        require(emergencyEvents[_eventId].patientAddress != address(0), "Event does not exist");
        return emergencyEvents[_eventId];
    }
}