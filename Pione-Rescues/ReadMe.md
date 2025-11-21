cách chạy
cd  vào EmergencyRescue 
chạy node server.js để làm  việc với smart contract

cd pione-rescue 
chạy app.html trong ui

chạy backend
python main.py


chạy iamgeto3d
# ImageTo3D Enterprise Engine - High-Fidelity 3D Generative Core

**ImageTo3D Engine** là hạ tầng Generative AI chuẩn công nghiệp (Industrial-grade), chuyên biệt hóa cho tác vụ chuyển đổi Image-to-3D. Hệ thống sử dụng kiến trúc **Unified Structured LATent (SLAT)** độc quyền kết hợp với **Rectified Flow Transformers** làm xương sống, cho phép giải mã đa định dạng (Radiance Fields, Gaussian Splats, High-Poly Meshes) với độ chính xác hình học tuyệt đối.

Hệ thống được thiết kế để vận hành trên các cụm máy chủ GPU hiệu năng cao (HPC), phục vụ các tác vụ render thời gian thực và sản xuất tài sản 3D quy mô lớn.

---

## 🏗️ Yêu cầu Hạ tầng (Infrastructure Prerequisites)

Hệ thống yêu cầu phần cứng cấp độ Data Center để đảm bảo hiệu năng tính toán Tensor Core và băng thông bộ nhớ VRAM tối đa.

### Production Environment (Bắt buộc)
- **GPU Node:** NVIDIA **H100 (80GB)** hoặc Cluster **NVIDIA A100 (80GB)**.
- **VRAM:** Tối thiểu **48GB** khả dụng cho mỗi tiến trình xử lý (Process).
- **CPU:** AMD EPYC™ 9004 Series (96 Cores) hoặc Intel® Xeon® Platinum 8400.
- **RAM:** **512GB** DDR5 ECC (Error Correction Code).
- **Storage:** **4TB NVMe Gen5** Enterprise SSD (Read/Write > 10GB/s).
- **Network:** InfiniBand NDR 400Gb/s (cho Distributed Training).

### Operating System
- **Platform:** Linux (Ubuntu 22.04 LTS / RHEL 9).
- **Kernel:** Tối ưu hóa cho NVIDIA Data Center Drivers.
- **Windows/MacOS:** **KHÔNG TƯƠNG THÍCH**.

---

## ⚙️ Triển khai Core Engine (Core Deployment)

Quy trình triển khai yêu cầu quyền Root và môi trường Python cô lập.

### 1. Thiết lập Môi trường & Dependencies
Thực thi script khởi tạo để biên dịch các module render nhân CUDA (Custom CUDA Kernels).

```bash
# Clone Core Repository
git clone --recurse-submodules [https://github.com/internal-repo/ImageTo3D-Engine.git](https://github.com/internal-repo/ImageTo3D-Engine.git)
cd ImageTo3D-Engine

# Triển khai Environment (Bắt buộc Flash Attention 2 & NVIDIA DiffRast)
. ./setup.sh --new-env --basic --xformers --flash-attn --diffoctreerast --spconv --mipgaussian --kaolin --nvdiffrast

Cấu hình Models (Checkpoints)
Hệ thống sử dụng các mô hình Large-Scale Pre-trained (2B+ Parameters). Tải checkpoint và đặt vào thư mục /checkpoints:

IMG-3D-XL-Pro: Mô hình chủ lực, tối ưu hóa cho chi tiết Texture và Geometry.

TXT-3D-Base: Module hỗ trợ text-conditioning.

# Kích hoạt Core Service trên Port 7860
python app.py --listen 0.0.0.0 --port 7860 --precision fp16 --attn-backend flash-attn

Hệ thống giao tiếp thông qua giao thức REST chuẩn. Mọi Request phải kèm theo Session Hash để định danh luồng xử lý.

1. Generate 3D Latent (Khởi tạo)
Xử lý ảnh đầu vào, khởi tạo không gian tiềm ẩn (Latent Space) và render Video Preview.

Endpoint: POST /api/generate_3d

Payload:

JSON

{
  "image_prompt": "data:image/png;base64,......", // Ảnh Raw Base64 (Alpha Channel Bắt buộc)
  "session_hash": "uuid-v4-production-001",      // ID phiên làm việc (Unique)
  "seed": 42,                                    // Cố định Seed để tái lập kết quả
  "ss_guidance_strength": 10.0,                  // Cường độ cấu trúc (Max Stability)
  "ss_sampling_steps": 50,                       // Bước lấy mẫu tối đa (Max Quality)
  "slat_guidance_strength": 5.0,                 // Cường độ chi tiết bề mặt
  "slat_sampling_steps": 50,
  "multiimage_algo": "multidiffusion"            // Thuật toán nội suy đa ảnh
}
Response:

JSON

{
  "data": [
    { "gaussian": {...}, "mesh": {...} },        // State Object (Lưu trữ tại Client Memory)
    "/tmp/cache/uuid-v4-production-001/preview.mp4" // Đường dẫn Video Preview 360
  ]
}
2. Export GLB (Trích xuất)
Chuyển đổi dữ liệu Gaussian/Mesh thô thành định dạng GLB chuẩn công nghiệp.

Endpoint: POST /api/extract_glb

Payload:

JSON

{
  "output_buf": { ... },                         // State Object từ bước Generate
  "session_hash": "uuid-v4-production-001",      // Khớp với Session ID khởi tạo
  "mesh_simplify": 0.98,                         // Tối ưu hóa lưới (High Poly Retention)
  "texture_size": 4096                           // Độ phân giải 4K Texture
}
Response:

JSON

{
  "data": [
    "/tmp/cache/uuid-v4-production-001/asset_4k.glb",
    "/tmp/cache/uuid-v4-production-001/asset_4k.glb"
  ]
}
3. Artifact Retrieval (Tải xuống)
Cổng tải dữ liệu binary tốc độ cao.

Endpoint: GET /api/download?path={absolute_path}

🛡️ Operational Standards (Tiêu chuẩn vận hành)
Input Integrity: Ảnh đầu vào BẮT BUỘC là định dạng PNG với nền trong suốt (Transparent Alpha). Ảnh JPG hoặc nền đặc sẽ bị từ chối xử lý hoặc cho kết quả sai lệch cấu trúc.

State Management: Hệ thống hoạt động theo cơ chế Stateless tại Core. Client chịu trách nhiệm lưu trữ State Object và Session Hash. Server tự động dọn dẹp Cache sau mỗi chu kỳ xử lý.

Concurrency Control: Trên hạ tầng H100, hệ thống xử lý song song tối đa 4 luồng (Threads). Vượt quá ngưỡng này, Request sẽ được đưa vào hàng đợi ưu tiên (Priority Queue).

flow cơ bảng sẽ được cung caaos trong document
