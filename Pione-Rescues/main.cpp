#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <WiFi.h>
#include <WebServer.h>

// --- CẤU HÌNH WIFI ---
const char* ssid = "TEN_WIFI_CUA_BAN";
const char* password = "MAT_KHAU_WIFI";

// Khởi tạo Server ở port 80
WebServer server(80);

// Khởi tạo cảm biến
MAX30105 particleSensor;

// Biến đo nhịp tim
const byte RATE_SIZE = 4; 
byte rates[RATE_SIZE]; 
byte rateSpot = 0;
long lastBeat = 0; 
float beatsPerMinute;
int beatAvg = 0;
long irValue = 0;

// --- HÀM XỬ LÝ API ---
void handleGetBPM() {
  // Tạo chuỗi JSON thủ công
  String jsonResponse = "{";
  jsonResponse += "\"bpm\": " + String(beatAvg) + ",";
  jsonResponse += "\"status\": \"" + String(irValue > 50000 ? "detected" : "no_finger") + "\",";
  jsonResponse += "\"raw_ir\": " + String(irValue);
  jsonResponse += "}";

  // Trả về code 200 (OK) và định dạng JSON
  server.send(200, "application/json", jsonResponse);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

void setup() {
  Serial.begin(115200);

  // 1. Kết nối WiFi
  WiFi.begin(ssid, password);
  Serial.print("Dang ket noi WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Da ket noi! IP: ");
  Serial.println(WiFi.localIP()); // In địa chỉ IP để bạn biết đường gọi

  // 2. Khởi tạo cảm biến
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) { 
    Serial.println("MAX30102 not found!");
    while (1);
  }
  particleSensor.setup(); 
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);

  // 3. Định nghĩa các đường dẫn API (Endpoint)
  server.on("/api/bpm", HTTP_GET, handleGetBPM); // API chính
  server.onNotFound(handleNotFound);

  // 4. Bắt đầu Server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // Xử lý các yêu cầu từ client gửi đến
  server.handleClient();

  // --- PHẦN ĐO NHỊP TIM ---
  irValue = particleSensor.getIR();

  if (irValue > 50000) { // Nếu có ngón tay
    if (checkForBeat(irValue) == true) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      beatsPerMinute = 60 / (delta / 1000.0);

      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
        beatAvg = 0;
        for (byte x = 0 ; x < RATE_SIZE ; x++) beatAvg += rates[x];
        beatAvg /= RATE_SIZE;
      }
    }
  } else {
    beatAvg = 0; // Reset về 0 khi không có ngón tay
  }
}