import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import base64

class YoloService:
    def __init__(self, model_path="yolov8n.pt"):
        print(f"🔄 Đang tải model YOLO từ {model_path}...")
        self.model = YOLO(model_path)
        print("✅ Model đã sẵn sàng!")

    def process_image(self, image_bytes: bytes):
        """
        Hàm nhận bytes ảnh, chạy YOLO, vẽ box
        Trả về: 
        - processed_img_bgr: ảnh đã vẽ box (dạng numpy array BGR)
        - detections: list chứa thông tin label, conf, box
        """
        # Chuyển bytes thành ảnh PIL
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Chạy dự đoán
        results = self.model.predict(source=image, conf=0.25, verbose=False)
        
        # Chuyển sang format openCV (BGR) để vẽ
        img_bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        detections = []

        # Xử lý kết quả
        for r in results:
            for box in r.boxes:
                # Lấy tọa độ
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = self.model.names[cls_id]

                # Lưu thông tin detection
                detections.append({
                    "label": label,
                    "confidence": round(conf, 2),
                    "box": [x1, y1, x2, y2]
                })

                # Vẽ lên ảnh
                color = (0, 255, 0) # Màu xanh lá
                cv2.rectangle(img_bgr, (x1, y1), (x2, y2), color, 2)
                cv2.putText(
                    img_bgr,
                    f"{label} {conf:.2f}",
                    (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    color,
                    2
                )
        
        return img_bgr, detections

    def image_to_base64(self, img_bgr):
        """Chuyển đổi ảnh OpenCV (numpy) sang chuỗi Base64 để gửi qua JSON"""
        _, buffer = cv2.imencode(".jpg", img_bgr)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        return img_base64

    def image_to_bytes(self, img_bgr):
        """Chuyển đổi ảnh OpenCV sang bytes để dùng cho StreamingResponse"""
        _, buffer = cv2.imencode(".jpg", img_bgr)
        return io.BytesIO(buffer.tobytes())