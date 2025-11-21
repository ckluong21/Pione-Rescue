PS D:\Working\pione\deploy_smart_contract\Legacy-contract> npx hardhat run scripts/deploy-factory.js --network pioneZero
[dotenv@17.2.3] injecting env (2) from .env -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }
[dotenv@17.2.3] injecting env (0) from .env -- tip: 👥 sync secrets across teammates & machines: https://dotenvx.com/ops
[dotenv@17.2.3] injecting env (0) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
Deploying contracts with the account: 0x7e2FB409CEe4Fc7C9ba7aaaEd133f134B48D2daE
Account balance: 589296828424778403
Network: pioneZero
Deploying AchievementLedger_Minimal...
AchievementLedger_Minimal deployed to: 0x4908b6553525bd163E60AA48C9431D769886939c
Transaction hash: 0xbebe8d0dc4b3c1cb68da4f31e9e77d2098df0db6b9e88f3d1f7231ca92426030
EXPLORER_API_KEY not found. Skipping verification.
Deployment completed!
AchievementLedger_Minimal Contract Address: 0x4908b6553525bd163E60AA48C9431D769886939c
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
2) kêu ai tạo nhưng phải thay cái contractadrress ta vừa lấy được ở trên là: 0x4065F0885BB27AF2C7B14E6FBe94Fc02d700FA60
3) tải thư viện npm install express ethers dotenv cors
4) chạy node server.js

Deploying contracts with the account: 0x7e2FB409CEe4Fc7C9ba7aaaEd133f134B48D2daE
Account balance: 686333007653699452
Network: pioneZero
Deploying VisionMateLedger...
VisionMateLedger deployed to: 0x4065F0885BB27AF2C7B14E6FBe94Fc02d700FA60
Transaction hash: 0xb027cf54ad7ff2bc55ddc6f200704c94a76a005999c97ec0d808e62d1b4b9a4b
EXPLORER_API_KEY not found. Skipping verification.
Deployment completed!
VisionMateLedger Contract Address: 0x4065F0885BB27AF2C7B14E6FBe94Fc02d700FA60
Owner: 0x7e2FB409CEe4Fc7C9ba7aaaEd133f134B48D2daE
PS D:\Working\pione\deploy_smart_contract\EmergencyRescue>