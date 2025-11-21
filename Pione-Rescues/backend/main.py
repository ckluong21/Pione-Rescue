from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from sqlalchemy.orm import Session
import httpx
import os
import uuid
import base64
import json
from typing import List, Optional
from pydantic import BaseModel
import cv2

# Import local modules
from yolo_service import YoloService
from database import Base, engine, get_db, User, Model3D, create_tables

# --- KHỞI TẠO ---
create_tables() # Tạo bảng nếu chưa có
app = FastAPI(title="IoT & 3D Gen AI Backend")

# Mount thư mục static để client có thể tải file GLB trực tiếp
os.makedirs("static/models", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

yolo_service = YoloService("yolov8n.pt")

# URL của server 3D (cái chạy Postman)
# Giả sử server 3D chạy ở port 8000 như trong postman
EXTERNAL_3D_API_URL = "http://127.0.0.1:8000" 
N8N_WEBHOOK_URL = "https://workflow.emg.edu.vn:5678/webhook/pione-rescue"

# --- MODELS INPUT ---
class IoTRequest(BaseModel):
    cccd: str
    walletAddress: str
    
# --- LOGIC PHỤ TRỢ ---

async def call_iot_device(device_ip: str):
    """
    Thực hiện gọi request tới thiết bị IoT thông qua IP.
    """
    url = f"http://{device_ip}/" 
    print(f"📡 Đang kết nối tới thiết bị IoT tại: {url}")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            
            if resp.status_code == 200:
                return resp.json() # Trả về JSON thật từ thiết bị
            else:
                raise HTTPException(status_code=resp.status_code, detail="Thiết bị từ chối kết nối")
                
    except Exception as e:
        # --- MOCK DATA (Trả về đúng format bạn yêu cầu khi không có thiết bị thật) ---
        print(f"⚠️ Lỗi kết nối ({str(e)}), trả về dữ liệu giả lập.")
        return {
          "heart_rate": 130,
          "spo2": 98,
          "resp_rate": 16,
          "bp_systolic": 120,
          "bp_diastolic": 80,
          "temp": 36.5,
          "hrv": 45,
          "stress": 30,
          "sleep_quality": "Good",
          "sleep_duration": "7h 30m",
          "steps": 1200,
          "distance": 1.5,
          "calories": 300,
          "activity_min": 45,
          "ecg_status": "Normal",
          "fall_detection": "Normal",
          "afib_alert": "Normal",
          "cycle_tracking": "Day 10",
          "vo2_max": 40,
          "training_load": 200,
          "hrr": 30,
          "recovery": 80
        }

async def call_external_ai_trigger(data: dict):
    """Gọi AI bên ngoài để check High/Low"""
    # Giả lập logic
    # async with httpx.AsyncClient() as client:
    #    resp = await client.post("http://external-ai.com/check", json=data)
    #    return resp.json()
    
    # Mock return
    import random
    status = random.choice(["high", "low"])
    return {"output": status}

# async def generate_markdown_description(labels: List[str]):
#     """Gọi AI (VD: ChatGPT/Gemini) để tạo mô tả từ nhãn YOLO"""
#     obj_text = ", ".join(labels)
#     return f"## Phân tích hình ảnh\n\nHệ thống phát hiện các đối tượng: **{obj_text}**.\nĐây là mô hình 3D được tạo dựa trên cấu trúc của đối tượng này."

async def generate_markdown_description(labels: List[str]):
    """Gọi AI (VD: ChatGPT/Gemini) để tạo mô tả từ nhãn YOLO"""
    obj_text = ", ".join(labels)
    # Giả định đây là kết quả GenAI trả về với format chi tiết cho Client
    return {
        "ten_benh": "Phân tích đối tượng YOLO",
        "bo_phan_co_the": "Hình ảnh",
        "loai_benh": f"Phát hiện: {obj_text}",
        "do_chinh_xac": 0.98,
        "mo_ta": f"**Phát hiện YOLO:** Hệ thống nhận diện thành công các đối tượng: **{obj_text}**.",
        "khuyen_nghi": "Khuyến nghị: Mô hình 3D có thể được tạo dựa trên các đối tượng này.",
    }
# --- API ENDPOINTS ---

@app.get("/")
def root():
    return {"message": "🚀 Backend System Ready"}

# 1. Get IoT (User gọi -> Backend gọi IoT -> Trả về User)
@app.post("/getIoT")
async def get_iot_data(payload: IoTRequest, db: Session = Depends(get_db)):
    """
    1. Nhận CCCD & Wallet từ Client.
    2. Check User -> Lấy IP (iot_id).
    3. Gọi IP đó -> Lấy data sức khoẻ.
    4. Return data cho Client.
    """
    # 1. Tìm user bằng CCCD
    user = db.query(User).filter(User.cccd == payload.cccd).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng với CCCD này")
    
    # 2. Kiểm tra ví chính chủ
    if user.wallet_address != payload.walletAddress:
        raise HTTPException(status_code=403, detail="Địa chỉ ví không khớp")

    # 3. Lấy IP
    device_ip = user.iot_id
    if not device_ip:
        raise HTTPException(status_code=400, detail="Chưa cấu hình IP thiết bị")

    # 4. Gọi thiết bị (hoặc lấy data giả lập nếu lỗi)
    health_data = await call_iot_device(device_ip)
    
    # 5. Trả về Client
    return {
        "status": "success",
        "user_cccd": payload.cccd,
        "device_ip": device_ip,
        "data": health_data
    }

@app.post("/aitriggerhelp")
async def ai_trigger_help(payload: dict):
    """
    Nhận data -> Gửi data gốc đến n8n -> Nhận kết quả High/Low từ n8n -> Return
    """
    
    # Dữ liệu gửi đi là toàn bộ payload nhận được từ client
    data_to_send = payload
    output_status = "low" # Giá trị mặc định nếu có lỗi
    
    try:
        # 1. Gửi dữ liệu gốc (payload) tới Webhook n8n và chờ phản hồi
        # Lưu ý: Thêm verify=False để xử lý chứng chỉ SSL tự ký (self-signed) nếu cần.
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            
            # Gửi toàn bộ dữ liệu (data_to_send) đến n8n
            response = await client.post(N8N_WEBHOOK_URL, json=data_to_send)
            
            # Kiểm tra lỗi HTTP từ n8n
            response.raise_for_status() 

            # 2. Nhận kết quả từ n8n và trích xuất status
            # Giả định n8n trả về JSON có cấu trúc: {"output": "high"}
            ai_result_from_n8n = response.json()
            output_status = ai_result_from_n8n.get("output", "unknow")
            
        # 3. Trả về phản hồi cho người gọi ban đầu
        return {
            "status": "processed",
            "trigger_level": output_status, # Sử dụng kết quả thực từ n8n
            "original_data": payload
        }
        
    except httpx.HTTPStatusError as e:
        # Xử lý lỗi HTTP (ví dụ: n8n trả về 404, 500)
        error_message = f"Lỗi từ n8n Webhook: {e.response.status_code} - {e.response.text}"
        print(error_message)
        return JSONResponse(status_code=500, content={"error": error_message})
        
    except Exception as e:
        # Xử lý lỗi kết nối hoặc parsing JSON
        error_message = f"Lỗi trong quá trình xử lý hoặc kết nối n8n: {e}"
        print(error_message) 
        return JSONResponse(status_code=500, content={"error": error_message})

# 3. Image to 3D Workflow (Phức tạp nhất)
@app.post("/imageto3d")
async def image_to_3d_flow(
    cccd: str = Form(...),
    wallet_address: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Workflow:
    1. Nhận ảnh + Info user.
    2. YOLO Detect -> Lấy thông tin.
    3. GenAI -> Tạo mô tả Markdown.
    4. Gọi 3D API (Generate -> Extract -> Download GLB).
    5. Lưu file GLB vào đĩa.
    6. Lưu DB (User + Model Path + Markdown).
    """
    # --- BƯỚC 0: KIỂM TRA/TẠO USER ---
    user = db.query(User).filter(User.cccd == cccd).first()
    if not user:
        # Nếu chưa có user thì tạo mới (hoặc báo lỗi tuỳ nghiệp vụ)
        user = User(cccd=cccd, wallet_address=wallet_address)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Validate ví
        if user.wallet_address != wallet_address:
             raise HTTPException(status_code=400, detail="Wallet address does not match CCCD")

    try:
        # --- BƯỚC 1: XỬ LÝ ẢNH & YOLO ---
        image_bytes = await file.read()
        processed_img, detections = yolo_service.process_image(image_bytes)
        
        # Lấy danh sách nhãn để tạo mô tả
        labels = [d['label'] for d in detections] if detections else ["object"]
        
        # --- BƯỚC 2: TẠO MÔ TẢ MARKDOWN (MOCK GENAI) ---
        markdown_desc = await generate_markdown_description(labels)
        
        # Chuẩn bị ảnh Base64 cho API 3D
        img_base64 = yolo_service.image_to_base64(processed_img) # Hoặc dùng ảnh gốc chưa vẽ box tuỳ bạn
        # img_base64_raw = base64.b64encode(image_bytes).decode('utf-8') # Dùng ảnh gốc thì tốt hơn cho AI 3D
        
        # --- BƯỚC 3: GỌI WORKFLOW 3D (Theo Postman) ---
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 3.1 Gọi /api/generate_3d
            gen_payload = {
                "image_prompt": f"data:image/jpeg;base64,{img_base64}",
                "seed": 123,
                "ss_guidance_strength": 7.5, 
                "ss_sampling_steps": 12,
                "slat_guidance_strength": 3.0, 
                "slat_sampling_steps": 12,
                "multiimage_algo": "stochastic",
                 "session_hash": str(uuid.uuid4()) # Random hash
            }
            resp_gen = await client.post(f"{EXTERNAL_3D_API_URL}/api/generate_3d", json=gen_payload)
            if resp_gen.status_code != 200:
                raise HTTPException(status_code=500, detail="3D Gen API Failed")
            
            # Parse session path từ response Postman
            # Response mẫu: {"data": [{"mock_session_path": "...", "status": "ready"}, ...]}
            gen_data = resp_gen.json()
            # Lưu ý: Cần bắt đúng cấu trúc JSON thực tế của bạn
            mock_session_path = gen_data.get("data", [{}])[0].get("mock_session_path") 
            
            if not mock_session_path:
                 # Fallback logic nếu API trả về khác
                 raise HTTPException(status_code=500, detail="Could not get session path from 3D API")

            # 3.2 Gọi /api/extract_glb
            extract_payload = {
                "output_buf": {
                    "session_path": mock_session_path,
                    "status": "ready"
                },
                "mesh_simplify": 0.95,
                "texture_size": 1024
            }
            resp_extract = await client.post(f"{EXTERNAL_3D_API_URL}/api/extract_glb", json=extract_payload)
            # Response mẫu: {"data": ["path/to/file.glb", ...]}
            extract_data = resp_extract.json()
            remote_glb_path = extract_data.get("data", [])[0]

            # 3.3 Gọi /api/download
            resp_download = await client.get(f"{EXTERNAL_3D_API_URL}/api/download", params={"path": remote_glb_path})
            
            if resp_download.status_code == 200:
                # --- BƯỚC 4: LƯU FILE VÀO Ổ ĐĨA ---
                filename = f"{uuid.uuid4()}.glb"
                local_path = f"static/models/{filename}"
                
                with open(local_path, "wb") as f:
                    f.write(resp_download.content)
                
                # --- BƯỚC 5: LƯU VÀO DB ---
                new_model = Model3D(
                    user_id=user.id,
                    description=markdown_desc,
                    glb_file_path=local_path
                )
                db.add(new_model)
                db.commit()
                
                # Trả về kết quả cho client
                return {
                    "status": "success",
                    "message": "3D Model Generated",
                    "data": {
                        "model_id": new_model.id,
                        "description": markdown_desc,
                        "model_url": f"http://localhost:3004/{local_path}", # Client load file này
                        "yolo_detections": detections
                    }
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to download GLB file")

    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": str(e)})

# 4. API Lấy danh sách Model của User
@app.post("/user/models")
def get_user_models(payload: dict, db: Session = Depends(get_db)):
    """
    Nhận CCCD & Wallet -> Trả về list models
    """
    cccd = payload.get("cccd")
    wallet = payload.get("wallet_address")
    
    user = db.query(User).filter(User.cccd == cccd, User.wallet_address == wallet).first()
    
    if not user:
        return {"status": "error", "message": "User not found or credentials invalid"}
    
    return {
        "user": user.cccd,
        "models": [
            {
                "id": m.id,
                "description": m.description,
                "file_url": f"http://localhost:3004/{m.glb_file_path}",
                "created_at": m.created_at
            }
            for m in user.models
        ]
    }


@app.post("/ai-care")
async def ai_care_analysis(
    file: UploadFile = File(...),
):
    """
    Workflow:
    1. Nhận ảnh (FormData).
    2. YOLO Detect -> Lấy thông tin (và Ảnh đã vẽ box).
    3. GenAI (Mock) -> Tạo mô tả kết quả.
    4. Trả về Ảnh đã vẽ box (Base64/URL) và Mô tả cho Client.
    """
    try:
        # --- BƯỚC 1: XỬ LÝ ẢNH & YOLO ---
        image_bytes = await file.read()
        # processed_img là numpy array BGR đã vẽ box
        processed_img, detections = yolo_service.process_image(image_bytes)
        
        # Lấy danh sách nhãn để tạo mô tả
        labels = [d['label'] for d in detections] if detections else ["object"]
        
        # --- BƯỚC 2: TẠO MÔ TẢ KẾT QUẢ (GenAI Mock) ---
        markdown_data = await generate_markdown_description(labels)
        
        # --- BƯỚC 3: CHUẨN BỊ ẢNH KẾT QUẢ (Base64) ---
        # Chúng ta cần lưu ảnh đã vẽ box để client hiển thị
        filename = f"result_{uuid.uuid4()}.jpg"
        local_path = f"static/{filename}"
        
        # Chuyển numpy BGR sang bytes và lưu vào đĩa
        _, buffer = cv2.imencode(".jpg", processed_img)
        with open(local_path, "wb") as f:
            f.write(buffer.tobytes())
            
        # URL để client có thể tải ảnh đã xử lý
        # Giả định app chạy trên port 3004 (như trong __main__)
        result_url = f"http://localhost:3004/static/{filename}" 
        
        # --- BƯỚC 4: TRẢ VỀ KẾT QUẢ ---
        return {
            "status": "success",
            "ten_benh": markdown_data["ten_benh"],
            "bo_phan_co_the": markdown_data["bo_phan_co_the"],
            "loai_benh": markdown_data["loai_benh"],
            "do_chinh_xac": markdown_data["do_chinh_xac"],
            "mo_ta": markdown_data["mo_ta"],
            "khuyen_nghi": markdown_data["khuyen_nghi"],
            "link_anh_api": result_url # Gửi URL tuyệt đối
        }
        
    except Exception as e:
        print(f"Lỗi xử lý AI-Care: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/ai-rescue")
async def ai_rescue_analysis(
    file: UploadFile = File(...),
):
    """
    Workflow cho AI Rescue (Tương tự AI-Care):
    1. Nhận ảnh (FormData).
    2. YOLO Detect -> Lấy thông tin (và Ảnh đã vẽ box).
    3. GenAI (Mock) -> Tạo mô tả kết quả (dùng format của AI Rescue).
    4. Trả về Ảnh đã vẽ box (URL) và Mô tả cho Client.
    """
    try:
        # --- BƯỚC 1: XỬ LÝ ẢNH & YOLO ---
        image_bytes = await file.read()
        processed_img, detections = yolo_service.process_image(image_bytes)
        
        # Lấy danh sách nhãn để tạo mô tả
        labels = [d['label'] for d in detections] if detections else ["Vật thể lạ", "Không xác định"]
        
        # --- BƯỚC 2: TẠO MÔ TẢ KẾT QUẢ MOCK THEO FORMAT RESCUE (MỚI) ---
        
        # Giả lập logic AI Rescue trả về tình trạng khẩn cấp
        tinh_trang_mock = "Phát hiện sự cố: " + labels[0]
        muc_do_mock = "Cao" if "hỏa hoạn" in labels or "người" in labels else "Trung bình"
        mo_ta_rescue = f"**Dấu hiệu:** Phát hiện {', '.join(labels)}.\n\n**Vị trí:** Phân tích sơ bộ từ hình ảnh."
        khuyen_nghi_rescue = "Khuyến nghị khẩn cấp:\n\n- **Gọi cấp cứu** ngay lập tức.\n- Tuyệt đối không di chuyển nạn nhân nếu nghi ngờ chấn thương cột sống."

        # --- BƯỚC 3: CHUẨN BỊ ẢNH KẾT QUẢ (URL) ---
        filename = f"rescue_result_{uuid.uuid4()}.jpg"
        local_path = f"static/{filename}"
        
        # Chuyển numpy BGR sang bytes và lưu vào đĩa
        _, buffer = cv2.imencode(".jpg", processed_img)
        with open(local_path, "wb") as f:
            f.write(buffer.tobytes())
            
        # URL để client có thể tải ảnh đã xử lý
        result_url = f"http://localhost:3004/static/{filename}" 
        
        # --- BƯỚC 4: TRẢ VỀ KẾT QUẢ CHO CLIENT RESCUE ---
        return {
            "status": "success",
            "tinh_trang": tinh_trang_mock,
            "muc_do": muc_do_mock,
            "doi_tuong_anh_huong": "Con người",
            "do_chinh_xac": 0.95,
            "mo_ta": mo_ta_rescue,
            "khuyen_nghi": khuyen_nghi_rescue,
            "link_anh_api": result_url # Gửi URL tuyệt đối
        }
        
    except Exception as e:
        print(f"Lỗi xử lý AI-Rescue: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

        
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3004)