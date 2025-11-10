// Để chạy file này, bạn cần cài đặt: npm install express ethers dotenv cors
// Sau đó chạy bằng: node server.js

const express = require('express');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load biến môi trường từ .env
const cors = require('cors');

const app = express();
app.use(cors()); // Cho phép Cross-Origin Resource Sharing
app.use(express.json()); // Middleware để phân tích body JSON

// --- CẤU HÌNH BLOCKCHAIN ---
const RPC_URL = "https://rpc.zeroscan.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 
// ======================================================================================
// ĐỊA CHỈ CONTRACT EMERGENCY RESCUE MỚI
// ======================================================================================
const RESCUE_CONTRACT_ADDRESS = "0xfF142020E0BbB56Ff7cB9843Da9C0F571b36c94E"; 

// Kiểm tra Private Key ngay từ đầu
if (!PRIVATE_KEY) {
    console.error("==============================================");
    console.error("❌ LỖI KHỞI TẠO: PRIVATE_KEY không được tìm thấy. Ứng dụng dừng.");
    console.error("   Vui lòng kiểm tra file .env");
    console.error("==============================================");
    process.exit(1); 
}

// Khai báo biến toàn cục
let provider;
let wallet;
let RESCUE_ABI;
let rescueContract;
let SENDER_ADDRESS;

// --- KHỞI TẠO VÀ XỬ LÝ LỖI KHỞI TẠO ---
async function initializeBlockchain() {
    try {
        // 1. Khởi tạo Provider và Wallet
        provider = new ethers.JsonRpcProvider(RPC_URL);
        wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // 2. Lấy ABI (Đường dẫn ABI của Contract EmergencyRescue)
        const abiPath = path.join(__dirname, 'artifacts', 'contracts', 'EmergencyRescue.sol', 'EmergencyRescue.json');
        
        if (!fs.existsSync(abiPath)) {
            throw new Error(`File ABI không tồn tại tại đường dẫn: ${abiPath}`);
        }

        const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
        RESCUE_ABI = abiJson.abi;
        
        // 3. Khởi tạo Contract Object
        rescueContract = new ethers.Contract(RESCUE_CONTRACT_ADDRESS, RESCUE_ABI, wallet);
        SENDER_ADDRESS = wallet.address;

    } catch (error) {
        console.error("==============================================");
        console.error("❌ LỖI KHỞI TẠO BLOCKCHAIN (Ứng dụng đã bị dừng):");
        console.error(`   Chi tiết: ${error.message}`);
        console.error("==============================================");
        process.exit(1); 
    }
}

// ======================================================================================
// API NHÓM 1: QUẢN LÝ HỒ SƠ Y TẾ (Profile)
// ======================================================================================

// --- API 1: (Hàm createProfile) ---
app.post('/api/profile/create', async (req, res) => {
    const { _cccd, _name, _age, _allergies, _conditions } = req.body;
    if (!_cccd || !_name || _age === undefined || !_allergies || !_conditions) {
        return res.status(400).json({ error: "Thiếu các tham số: _cccd, _name, _age, _allergies, hoặc _conditions" });
    }
    try {
        const tx = await rescueContract.createProfile(_cccd, _name, _age, _allergies, _conditions, { gasLimit: 3000000 });
        const receipt = await tx.wait();
        res.status(200).json({
            message: "Tạo hồ sơ thành công",
            transactionHash: receipt.hash,
            cccd: _cccd
        });
    } catch (error) {
        console.error(`LỖI API createProfile: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi tạo hồ sơ", details: error.message });
    }
});

// --- API 2: (Hàm addTreatmentLog) ---
app.post('/api/profile/add-log', async (req, res) => {
    const { _cccd, _location, _verifierName, _details } = req.body;
    if (!_cccd || !_location || !_verifierName || !_details) {
        return res.status(400).json({ error: "Thiếu các tham số: _cccd, _location, _verifierName, hoặc _details" });
    }
    try {
        const tx = await rescueContract.addTreatmentLog(_cccd, _location, _verifierName, _details, { gasLimit: 3000000 });
        const receipt = await tx.wait();
        res.status(200).json({
            message: "Thêm lịch sử điều trị thành công",
            transactionHash: receipt.hash,
            cccd: _cccd
        });
    } catch (error) {
        console.error(`LỖI API addTreatmentLog: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi thêm lịch sử điều trị", details: error.message });
    }
});

// --- API 3: (Hàm getMedicalHistory) ---
app.get('/api/profile/:cccd', async (req, res) => {
    const { cccd } = req.params;
    try {
        const [profile, logs] = await rescueContract.getMedicalHistory(cccd);
        
        // Kiểm tra xem hồ sơ có tồn tại không (dựa trên isRegistered hoặc name)
        if (!profile.isRegistered) {
             return res.status(404).json({ error: `Không tìm thấy hồ sơ với CCCD: ${cccd}` });
        }

        // Định dạng lại logs để dễ đọc hơn
        const formattedLogs = logs.map(log => ({
            timestamp: log.timestamp.toString(),
            location: log.location,
            verifierName: log.verifierName,
            details: log.details
        }));

        res.status(200).json({
            profile: {
                name: profile.name,
                age: profile.age.toString(),
                allergies: profile.allergies,
                conditions: profile.conditions,
                isRegistered: profile.isRegistered
            },
            treatmentLogs: formattedLogs
        });
    } catch (error) {
        console.error(`LỖI API getMedicalHistory: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi lấy lịch sử y tế", details: error.message });
    }
});

// ======================================================================================
// API NHÓM 2: QUẢN LÝ QUỸ (Treasury)
// ======================================================================================

// --- API 4: (Hàm depositFunds) ---
app.post('/api/fund/deposit', async (req, res) => {
    const { amount } = req.body; // Ví dụ: "0.1" (đơn vị Ether)
    if (!amount) {
        return res.status(400).json({ error: "Thiếu tham số: amount (số Ether cần gửi)" });
    }
    try {
        const amountInWei = ethers.parseEther(amount);
        const tx = await rescueContract.depositFunds({ value: amountInWei, gasLimit: 3000000 });
        const receipt = await tx.wait();
        res.status(200).json({
            message: `Gửi quỹ thành công ${amount} PZO.`,
            transactionHash: receipt.hash
        });
    } catch (error) {
        console.error(`LỖI API depositFunds: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi gửi tiền quỹ", details: error.message });
    }
});

// --- API 5: (Hàm viewFundBalance) ---
app.get('/api/fund/balance', async (req, res) => {
    try {
        const balanceWei = await rescueContract.viewFundBalance();
        res.status(200).json({
            balanceWei: balanceWei.toString(),
            balanceEther: ethers.formatEther(balanceWei) // Chuyển đổi sang Ether
        });
    } catch (error) {
        console.error(`LỖI API viewFundBalance: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi xem số dư quỹ", details: error.message });
    }
});

// ======================================================================================
// API NHÓM 3: QUY TRÌNH KHẨN CẤP (Event Workflow)
// ======================================================================================

// --- API 6: (Hàm createEmergencyEvent) - CHỈ DÙNG BẰNG VÍ HỆ THỐNG/ORACLE ---
app.post('/api/event/create', async (req, res) => {
    const { _patientAddress, _patientCccd, _rewardAmount } = req.body; // _rewardAmount (đơn vị Ether)
    if (!_patientAddress || !_patientCccd || !_rewardAmount) {
        return res.status(400).json({ error: "Thiếu tham số: _patientAddress, _patientCccd, hoặc _rewardAmount" });
    }
    try {
        const rewardInWei = ethers.parseEther(_rewardAmount);
        const tx = await rescueContract.createEmergencyEvent(_patientAddress, _patientCccd, rewardInWei, { gasLimit: 3000000 });
        const receipt = await tx.wait();
        
        // Lấy eventId từ logs (nếu contract emit event)
        // (Giả định hàm createEmergencyEvent trả về eventId)
        // const eventId = ... (Cần logic lấy eventId từ receipt nếu hàm không trả về)
        // *Tạm thời, chúng ta sẽ dựa vào transaction hash*

        res.status(200).json({
            message: "Tạo sự kiện khẩn cấp thành công",
            transactionHash: receipt.hash
            // Cần thêm logic lấy eventId từ event `EmergencyEventCreated` trong receipt nếu hàm không trả về
        });
    } catch (error) {
        console.error(`LỖI API createEmergencyEvent: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi tạo sự kiện khẩn cấp (Kiểm tra xem ví gọi có phải Owner không)", details: error.message });
    }
});

// --- API 7: (Hàm assignRescuer) - CHỈ DÙNG BẰNG VÍ HỆ THỐNG/ORACLE ---
app.post('/api/event/assign', async (req, res) => {
    const { _eventId, _rescuerAddress } = req.body;
    if (_eventId === undefined || !_rescuerAddress) {
        return res.status(400).json({ error: "Thiếu tham số: _eventId hoặc _rescuerAddress" });
    }
    try {
        const tx = await rescueContract.assignRescuer(_eventId, _rescuerAddress, { gasLimit: 3000000 });
        const receipt = await tx.wait();
        res.status(200).json({
            message: `Gán người cứu hộ ${_rescuerAddress} cho sự kiện ${_eventId} thành công.`,
            transactionHash: receipt.hash
        });
    } catch (error) {
        console.error(`LỖI API assignRescuer: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi gán người cứu hộ (Kiểm tra xem ví gọi có phải Owner không)", details: error.message });
    }
});

// --- API 8: (Hàm confirmSuccessByPatient) - GỌI BỞI NẠN NHÂN (Xem cảnh báo) ---
app.post('/api/event/confirm', async (req, res) => {
    // CẢNH BÁO: API NÀY GỌI TỪ SERVER (VÍ ORACLE)
    // NẾU CONTRACT CÓ `require(msg.sender == event.patientAddress)`, GIAO DỊCH NÀY SẼ THẤT BẠI.
    // Đây chỉ là API demo giả định, trong thực tế, ví của NẠN NHÂN phải tự gọi hàm này.

    const { _eventId, _confirmedRescuerAddress } = req.body;
    if (_eventId === undefined || !_confirmedRescuerAddress) {
        return res.status(400).json({ error: "Thiếu tham số: _eventId hoặc _confirmedRescuerAddress" });
    }
    try {
        const tx = await rescueContract.confirmSuccessByPatient(_eventId, _confirmedRescuerAddress, { gasLimit: 3000000 });
        const receipt = await tx.wait();
        res.status(200).json({
            message: `(DEMO) Xác nhận thành công cho sự kiện ${_eventId} với người cứu hộ ${_confirmedRescuerAddress}.`,
            transactionHash: receipt.hash,
            warning: "Giao dịch này chỉ thành công nếu Smart Contract không kiểm tra msg.sender."
        });
    } catch (error) {
        console.error(`LỖI API confirmSuccessByPatient: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi xác nhận cứu hộ (Rất có thể do lỗi msg.sender != patientAddress)", details: error.message });
    }
});

// --- API 9: (Hàm verifyAndExecutePayment) - CHỈ DÙNG BẰNG VÍ HỆ THỐNG/ORACLE ---
app.post('/api/event/execute-payment', async (req, res) => {
    const { _eventId } = req.body;
    if (_eventId === undefined) {
        return res.status(400).json({ error: "Thiếu tham số: _eventId" });
    }
    try {
        const tx = await rescueContract.verifyAndExecutePayment(_eventId, { gasLimit: 3000000 });
        const receipt = await tx.wait();
        res.status(200).json({
            message: `Thanh toán thành công cho sự kiện ${_eventId}.`,
            transactionHash: receipt.hash
        });
    } catch (error) {
        console.error(`LỖI API verifyAndExecutePayment: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi thực thi thanh toán (Kiểm tra Owner, trạng thái Confirmed, và số dư quỹ)", details: error.message });
    }
});

// --- API 10: (Hàm viewAssignedRescuers) ---
app.get('/api/event/:eventId/rescuers', async (req, res) => {
    const { eventId } = req.params;
    try {
        const rescuers = await rescueContract.viewAssignedRescuers(eventId);
        res.status(200).json({
            eventId: eventId,
            potentialRescuers: rescuers
        });
    } catch (error) {
        console.error(`LỖI API viewAssignedRescuers: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi xem danh sách người cứu hộ", details: error.message });
    }
});

// --- API 11: (Hàm viewEventStatus) ---
app.get('/api/event/:eventId/status', async (req, res) => {
    const { eventId } = req.params;
    try {
        const eventStatus = await rescueContract.viewEventStatus(eventId);
        
        // Định dạng lại Struct để dễ đọc
        const formattedStatus = {
            patientAddress: eventStatus.patientAddress,
            patientCccd: eventStatus.patientCccd,
            rewardAmount: ethers.formatEther(eventStatus.rewardAmount) + " PZO",
            potentialRescuers: eventStatus.potentialRescuers,
            officialRescuerAddress: eventStatus.officialRescuerAddress,
            status: eventStatus.status.toString() // (0=Pending, 1=Assigned, 2=Confirmed, 3=Paid)
        };
        
        res.status(200).json(formattedStatus);
    } catch (error) {
        console.error(`LỖI API viewEventStatus: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi xem trạng thái sự kiện", details: error.message });
    }
});

// --- API 12: (Hàm nextEventId - Tự động tạo) LẤY TẤT CẢ EVENT IDS ---
app.get('/api/events/all-ids', async (req, res) => {
    try {
        // Gọi hàm getter (tự động tạo) của biến public 'nextEventId'
        const countBigInt = await rescueContract.nextEventId();
        
        // Chuyển đổi BigInt sang Number
        const totalEvents = Number(countBigInt); 

        // Tạo một mảng ID từ 0 đến (totalEvents - 1)
        const allIds = [];
        for (let i = 0; i < totalEvents; i++) {
            allIds.push(i.toString()); // Trả về dạng string
        }

        res.status(200).json({
            totalCount: totalEvents,
            eventIds: allIds
        });
    } catch (error) {
        console.error(`LỖI API viewAllEventIds: ${error.message}`);
        res.status(500).json({ error: "Lỗi khi lấy tất cả event IDs", details: error.message });
    }
});


// --- KHỞI ĐỘNG SERVER ---
const PORT = 3002;

async function startServer() {
    await initializeBlockchain();

    try {
        const network = await provider.getNetwork();
        
        console.log("==============================================");
        console.log(`✅ Đã kết nối thành công với mạng Pioné Zero. Chain ID: ${network.chainId}`);
        console.log(`   Địa chỉ gửi giao dịch (Oracle): ${SENDER_ADDRESS}`);
        console.log(`   Contract EmergencyRescue: ${RESCUE_CONTRACT_ADDRESS}`);
        console.log(`   API đang chạy tại http://localhost:${PORT}`);
        console.log("==============================================");
        console.log("Tổng cộng 11 API Endpoint đã được khởi tạo.");
        console.log("==============================================");

        app.listen(PORT, () => {
            console.log(`Express server đã sẵn sàng.`);
        });
    } catch (e) {
        console.error("LỖI KHỞI TẠO SERVER:", e.message);
        console.error("Vui lòng kiểm tra RPC URL và kết nối mạng.");
        process.exit(1);
    }
}

startServer();