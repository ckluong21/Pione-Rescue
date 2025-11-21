// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VisionMateLedger
 * @dev Hợp đồng này được sửa đổi từ AchievementLedger_Minimal.
 * Mục đích: 
 * 1. Lưu CID đóng góp (từ người dùng).
 * 2. Lưu CID mô hình toàn cục (từ admin/server).
 * 3. Cho phép Server/App đọc các CID này.
 */
contract VisionMateLedger {

    // =============================================================
    // STATE VARIABLES (Các biến lưu trữ dữ liệu)
    // =============================================================

    // Địa chỉ của Admin / FL Server (sẽ được gán khi deploy)
    address public owner;

    // Biến lưu CID của mô hình toàn cục (Global Model) mới nhất
    // "public" sẽ tự động tạo một hàm "xem" (get) tên là "latestGlobalModelCid()"
    string public latestGlobalModelCid;

    // Cấu trúc để lưu 1 đóng góp
    struct Contribution {
        address contributor; // Ví của người đóng góp
        string cid;          // CID của file trọng số
        uint256 timestamp;   // Thời gian nộp
    }

    // Mảng lưu trữ TẤT CẢ các đóng góp (thay vì mapping theo user)
    // "public" cũng tự động tạo 1 hàm "xem" tên là "allContributions(uint index)"
    Contribution[] public allContributions;

    // =============================================================
    // EVENTS (Thông báo - rất quan trọng cho backend)
    // =============================================================

    // Thông báo khi có người dùng nộp CID mới
    event ContributionSubmitted(
        address indexed user, 
        string cid, 
        uint indexed contributionIndex
    );
    
    // Thông báo khi Admin cập nhật mô hình toàn cục
    event GlobalModelUpdated(string newGlobalModelCid);

    // =============================================================
    // CONSTRUCTOR & MODIFIER (Thiết lập ban đầu & Bảo mật)
    // =============================================================

    // Hàm này chỉ chạy 1 LẦN DUY NHẤT khi bạn deploy contract
    constructor() {
        owner = msg.sender; // Gán quyền "owner" cho địa chỉ ví đã deploy
    }

    // "Modifier" này dùng để khóa các hàm chỉ dành cho "owner"
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // =============================================================
    // FUNCTIONS (Các hàm "Ghi" và "Xem" bạn cần)
    // =============================================================

    /**
     * @dev [HÀM GHI - USER]
     * Người dùng (từ App Vision Mate) gọi hàm này để nộp CID của họ.
     */
    function submitContribution(string memory _cid) external {
        // Yêu cầu CID không được rỗng
        require(bytes(_cid).length > 0, "CID cannot be empty");

        // Lấy chỉ số (index) của phần tử mới
        uint newIndex = allContributions.length;

        // Thêm đóng góp mới vào mảng
        allContributions.push(Contribution({
            contributor: msg.sender, // msg.sender là địa chỉ ví của người gọi hàm
            cid: _cid,
            timestamp: block.timestamp
        }));

        // === PHÁT THÔNG BÁO (EVENT) ===
        // Backend Server của bạn sẽ "lắng nghe" cái này
        emit ContributionSubmitted(msg.sender, _cid, newIndex);
    }

    /**
     * @dev [HÀM GHI - ADMIN/SERVER]
     * Chỉ Owner (FL Server) mới được gọi hàm này để cập nhật mô hình toàn cục.
     */
    function setGlobalModel(string memory _newGlobalModelCid) external onlyOwner {
        latestGlobalModelCid = _newGlobalModelCid;
        
        // Phát thông báo cho các app biết là có mô hình mới
        emit GlobalModelUpdated(_newGlobalModelCid);
    }

    // -------------------------------------------------------------
    // CÁC HÀM "XEM" (GET) - KHÔNG TỐN GAS KHI GỌI
    // -------------------------------------------------------------

    /**
     * @dev [HÀM XEM - APP & SERVER]
     * Lấy về CID của mô hình toàn cục mới nhất.
     * LƯU Ý: Hàm này thực ra không cần thiết vì biến "latestGlobalModelCid"
     * đã được khai báo là "public", nên Solidity tự tạo hàm này cho bạn rồi.
     * Nhưng tôi viết ra để bạn thấy rõ.
     */
    function getLatestGlobalModelCid() external view returns (string memory) {
        return latestGlobalModelCid;
    }

    /**
     * @dev [HÀM XEM - SERVER]
     * Lấy về tổng số lượng đóng góp đã được nộp.
     * (Server sẽ dùng cái này để biết cần lặp (loop) bao nhiêu lần để lấy data)
     */
    function getContributionCount() external view returns (uint) {
        return allContributions.length;
    }

    /**
     * @dev [HÀM XEM - SERVER]
     * Lấy chi tiết của một đóng góp cụ thể bằng chỉ số (index).
     * LƯU Ý: Hàm này cũng không bắt buộc vì biến "allContributions"
     * đã là "public", nhưng hàm này trả về dữ liệu gọn gàng hơn.
     */
    function getContributionDetails(uint _index) 
        external 
        view 
        returns (address contributor, string memory cid, uint timestamp) 
    {
        // Lấy dữ liệu từ mảng
        Contribution storage contrib = allContributions[_index];
        return (contrib.contributor, contrib.cid, contrib.timestamp);
    }
}