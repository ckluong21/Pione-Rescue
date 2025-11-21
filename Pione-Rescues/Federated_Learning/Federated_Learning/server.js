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

// --- CẤU HÌNH BLOCKCHAIN (ĐÃ CẬP NHẬT TỪ DATA DEPLOY) ---
const RPC_URL = "https://rpc.zeroscan.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 

// ======================================================================================
// CẬP NHẬT: ĐỊA CHỈ CONTRACT VISION MATE LEDGER (TỪ DATA DEPLOY)
// ======================================================================================
const VISIONMATE_CONTRACT_ADDRESS = "0x4065F0885BB27AF2C7B14E6FBe94Fc02d700FA60"; // <--- ĐÃ SỬA
const CONTRACT_NAME = "VisionMateLedger"; // <--- ĐÃ SỬA
const CONTRACT_FILE_NAME = "VisionMateLedger.sol"; // <--- ĐÃ SỬA

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
let VISIONMATE_ABI; // <--- ĐÃ SỬA
let visionMateContract; // <--- ĐÃ SỬA
let SENDER_ADDRESS;

// --- KHỞI TẠO VÀ XỬ LÝ LỖI KHỞI TẠO ---
async function initializeBlockchain() {
    try {
        // 1. Khởi tạo Provider và Wallet
        provider = new ethers.JsonRpcProvider(RPC_URL);
        wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // 2. Lấy ABI (Đường dẫn ABI của Contract VisionMateLedger)
        // Đảm bảo Hardhat đã biên dịch file VisionMateLedger.sol
        const abiPath = path.join(__dirname, 'artifacts', 'contracts', CONTRACT_FILE_NAME, `${CONTRACT_NAME}.json`); // <--- ĐÃ SỬA ĐƯỜNG DẪN
        
        if (!fs.existsSync(abiPath)) {
            // LỖI THƯỜNG GẶP: Chưa chạy npx hardhat compile hoặc đường dẫn sai.
            throw new Error(`File ABI không tồn tại tại đường dẫn: ${abiPath}. Đã chạy 'npx hardhat compile' chưa?`);
        }

        const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
        VISIONMATE_ABI = abiJson.abi; // <--- ĐÃ SỬA
        
        // 3. Khởi tạo Contract Object
        visionMateContract = new ethers.Contract(VISIONMATE_CONTRACT_ADDRESS, VISIONMATE_ABI, wallet); // <--- ĐÃ SỬA
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
// API CHÍNH: VISION MATE LEDGER
// ======================================================================================

// --- API 1 (User): Nộp một đóng góp (CID) ---
// GỌI HÀM: submitContribution
app.post('/api/contributions/submit', async (req, res) => {
    // Chỉ cần tham số "cid" từ body
    const { cid } = req.body; 

    if (!cid || typeof cid !== 'string' || cid.length < 10) {
        return res.status(400).json({ error: "Thiếu tham số 'cid' hoặc 'cid' không hợp lệ." });
    }
    
    console.log(`[API] Nhận yêu cầu /api/contributions/submit với CID: ${cid}`);

    try {
        // Gọi hàm Smart Contract
        const tx = await visionMateContract.submitContribution(
            cid, 
            { gasLimit: 300000 } // Đặt gas limit (có thể cần điều chỉnh)
        );
        const receipt = await tx.wait();

        res.status(200).json({
            message: "Nộp CID thành công",
            transactionHash: receipt.hash,
            sender: SENDER_ADDRESS,
            cidSubmitted: cid
        });
    } catch (error) {
        console.error(`LỖI API /api/contributions/submit: ${error.message}`);
        res.status(500).json({ 
            error: "Lỗi khi nộp CID (Kiểm tra Gas, RPC, và Private Key)", 
            details: error.message 
        });
    }
});

// --- API 2 (Admin/Server): Cập nhật mô hình toàn cục ---
// GỌI HÀM: setGlobalModel (Chỉ Owner mới gọi được)
app.post('/api/global-model/set', async (req, res) => {
    const { cid } = req.body;

    if (!cid || typeof cid !== 'string' || cid.length < 10) {
        return res.status(400).json({ error: "Thiếu tham số 'cid' hoặc 'cid' không hợp lệ." });
    }

    console.log(`[API] Nhận yêu cầu /api/global-model/set với CID: ${cid}`);

    try {
        // Gọi hàm Smart Contract (chỉ owner)
        const tx = await visionMateContract.setGlobalModel(
            cid, 
            { gasLimit: 300000 }
        );
        const receipt = await tx.wait();

        res.status(200).json({
            message: "Cập nhật mô hình toàn cục thành công",
            transactionHash: receipt.hash,
            sender: SENDER_ADDRESS, // Địa chỉ này PHẢI là Owner
            newGlobalModelCid: cid
        });
    } catch (error) {
        console.error(`LỖI API /api/global-model/set: ${error.message}`);
        // Lỗi này RẤT CÓ THỂ là do "Only the owner can call this function"
        res.status(500).json({ 
            error: "Lỗi khi cập nhật mô hình (Kiểm tra xem PRIVATE_KEY có phải là 'Owner' không)", 
            details: error.message 
        });
    }
});


// --- API 3 (App/Server): Lấy CID mô hình toàn cục mới nhất ---
// GỌI HÀM: getLatestGlobalModelCid
app.get('/api/global-model/latest', async (req, res) => {
    try {
        // Gọi hàm Smart Contract view (đọc dữ liệu)
        const cid = await visionMateContract.getLatestGlobalModelCid();
        
        res.status(200).json({
            latestGlobalModelCid: cid
        });
        
    } catch (error) {
        console.error(`LỖI API /api/global-model/latest: ${error.message}`);
        res.status(500).json({ 
            error: "Lỗi khi lấy CID mô hình toàn cục", 
            details: error.message 
        });
    }
});

// --- API 4 (Server): Lấy tổng số lượng đóng góp ---
// GỌI HÀM: getContributionCount
app.get('/api/contributions/count', async (req, res) => {
    try {
        const count = await visionMateContract.getContributionCount();
        
        res.status(200).json({
            count: Number(count) // Chuyển từ BigInt sang Number
        });
        
    } catch (error) {
        console.error(`LỖI API /api/contributions/count: ${error.message}`);
        res.status(500).json({ 
            error: "Lỗi khi lấy tổng số đóng góp", 
            details: error.message 
        });
    }
});

// --- API 5 (Server): Lấy chi tiết một đóng góp bằng Index ---
// GỌI HÀM: getContributionDetails
app.get('/api/contributions/details/:index', async (req, res) => {
    const { index } = req.params;

    try {
        const contribution = await visionMateContract.getContributionDetails(index);
        
        // Định dạng lại kết quả Struct từ Smart Contract
        const formattedContribution = {
            contributor: contribution.contributor,
            cid: contribution.cid,
            timestamp: Number(contribution.timestamp)
        };

        res.status(200).json(formattedContribution);
        
    } catch (error) {
        console.error(`LỖI API /api/contributions/details/${index}: ${error.message}`);
        // Lỗi này có thể do index nằm ngoài phạm vi (out of bounds)
        res.status(500).json({ 
            error: "Lỗi khi lấy chi tiết đóng góp (Kiểm tra index)", 
            details: error.message 
        });
    }
});


// --- KHỞI ĐỘNG SERVER ---
const PORT = 3005;

async function startServer() {
    await initializeBlockchain();

    try {
        const network = await provider.getNetwork();
        
        console.log("==============================================");
        console.log(`✅ Đã kết nối thành công với mạng Pioné Zero. Chain ID: ${network.chainId}`);
        console.log(`   Địa chỉ gửi giao dịch (Sender): ${SENDER_ADDRESS}`);
        console.log(`   Contract ${CONTRACT_NAME}: ${VISIONMATE_CONTRACT_ADDRESS}`);
        console.log(`   API đang chạy tại http://localhost:${PORT}`);
        console.log("==============================================");
        console.log("Tổng cộng 5 API Endpoint đã được khởi tạo cho VisionMateLedger.");
        console.log(" 1. POST /api/contributions/submit (Body: { cid })");
        console.log(" 2. POST /api/global-model/set (Body: { cid }) (Chỉ Owner)");
        console.log(" 3. GET  /api/global-model/latest");
        console.log(" 4. GET  /api/contributions/count");
        console.log(" 5. GET  /api/contributions/details/:index");
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