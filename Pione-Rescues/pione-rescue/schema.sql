-- Xóa bảng nếu tồn tại để làm sạch
DROP TABLE IF EXISTS event_potential_rescuers CASCADE;
DROP TABLE IF EXISTS emergency_events CASCADE;
DROP TABLE IF EXISTS treatment_logs CASCADE;
DROP TABLE IF EXISTS medical_profiles CASCADE;
DROP TABLE IF EXISTS system_funds CASCADE;

-- Bảng hồ sơ y tế
CREATE TABLE medical_profiles (
    cccd VARCHAR(12) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT,
    allergies TEXT,
    conditions TEXT,
    is_registered BOOLEAN DEFAULT true
);

-- Bảng lịch sử điều trị
CREATE TABLE treatment_logs (
    id SERIAL PRIMARY KEY,
    profile_cccd VARCHAR(12) REFERENCES medical_profiles(cccd) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    location VARCHAR(255),
    verifier_name VARCHAR(255),
    details TEXT
);

-- Bảng quản lý quỹ trung tâm (mô phỏng Smart Contract)
CREATE TABLE system_funds (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'main_fund',
    -- Dùng NUMERIC để lưu trữ số lớn như Wei
    balance_wei NUMERIC(30, 0) DEFAULT 0
);
-- Khởi tạo quỹ
INSERT INTO system_funds (id, balance_wei) VALUES ('main_fund', 0);

-- Bảng sự kiện khẩn cấp
CREATE TABLE emergency_events (
    id SERIAL PRIMARY KEY, -- Bắt đầu từ 1
    patient_address VARCHAR(42) NOT NULL,
    patient_cccd VARCHAR(12) REFERENCES medical_profiles(cccd),
    reward_amount_wei NUMERIC(30, 0) NOT NULL,
    official_rescuer_address VARCHAR(42) NULL, -- Người cứu hộ được bệnh nhân xác nhận
    status INT NOT NULL DEFAULT 0 -- 0: Mới tạo, 1: Có người nhận, 2: Bệnh nhân xác nhận, 3: Đã thanh toán
);

-- Bảng những người cứu hộ tiềm năng (những người đã chấp nhận sự kiện)
CREATE TABLE event_potential_rescuers (
    event_id INT REFERENCES emergency_events(id) ON DELETE CASCADE,
    rescuer_address VARCHAR(42) NOT NULL,
    PRIMARY KEY (event_id, rescuer_address)
);