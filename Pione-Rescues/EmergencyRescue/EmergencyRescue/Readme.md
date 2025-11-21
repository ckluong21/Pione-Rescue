# ví hiện tại vừa deploy 
PS D:\Working\pione\deploy_smart_contract\EmergencyRescue> npx hardhat run scripts/deploy-factory.js --network pioneZero
[dotenv@17.2.3] injecting env (2) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
[dotenv@17.2.3] injecting env (0) from .env -- tip: ✅ audit secrets and track compliance: https://dotenvx.com/ops
[dotenv@17.2.3] injecting env (0) from .env -- tip: ✅ audit secrets and track compliance: https://dotenvx.com/ops
Deploying contracts with the account: 0x7e2FB409CEe4Fc7C9ba7aaaEd133f134B48D2daE
Account balance: 390767225435072232
Network: pioneZero
Deploying EmergencyRescue...
EmergencyRescue deployed to: 0xE1713d5492e1c18F44E76Dc1123F099dB0216C64
Transaction hash: 0x35d204019e8255adb4518c785600c6041b05ffb1b6fc83131bb0896244a5db70
EXPLORER_API_KEY not found. Skipping verification.
Deployment completed!
EmergencyRescue Contract Address: 0xE1713d5492e1c18F44E76Dc1123F099dB0216C64
Owner: 0x7e2FB409CEe4Fc7C9ba7aaaEd133f134B48D2daE
PS D:\Working\pione\deploy_smart_contract\EmergencyRescue>
# kết thúc ví log deploy
- cách deploy
1) sửa trong contracts/file.sol (sửa lại cho các hàm mình muốn)
2) sửa scripts/deploy.js (sửa cho deploy cái file.sol)
3) thêm privatekey vào .evn
4) chạy npx hardhat compile
5) chạy  npx hardhat run scripts/deploy-factory.js --network pioneZero
6) sẽ nhận đc log như trên

# cách triển khai server làm việc với smartcontract: 
1) server.js
2) kêu ai tạo nhưng phải thay cái contractadrress ta vừa lấy được ở trên là: 0xE1713d5492e1c18F44E76Dc1123F099dB0216C64
3) tải thư viện npm install express ethers dotenv cors
4) chạy node server.js

5pm: triển khai 1 cái mới với private của phước 
Deploying contracts with the account: 0x41DBDD4C90bFDFedDb077282Dbf0fB6755FBdbb9
Account balance: 98423308738647823
Network: pioneZero
Deploying EmergencyRescue...
EmergencyRescue deployed to: 0xfF142020E0BbB56Ff7cB9843Da9C0F571b36c94E
Transaction hash: 0xec0e5898349a04c163f02792923154b83643099d47eb44c129d4471165a96e26
EXPLORER_API_KEY not found. Skipping verification.
Deployment completed!
EmergencyRescue Contract Address: 0xfF142020E0BbB56Ff7cB9843Da9C0F571b36c94E
Owner: 0x41DBDD4C90bFDFedDb077282Dbf0fB6755FBdbb9
PS D:\Working\pione\deploy_smart_contract\EmergencyRescue>