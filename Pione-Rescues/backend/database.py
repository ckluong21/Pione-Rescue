from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

# --- CẤU HÌNH KẾT NỐI DB ---
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Tạo connection string từ biến môi trường
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# In ra để debug (chỉ nên dùng khi dev, che password đi)
print(f"🔌 Connecting to DB: {DB_HOST}:{DB_PORT}/{DB_NAME}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- ĐỊNH NGHĨA BẢNG (MODELS) ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    cccd = Column(String, unique=True, index=True, nullable=False)
    wallet_address = Column(String, unique=True, nullable=False)
    iot_id = Column(String, nullable=True)
    
    # Quan hệ 1-nhiều với bảng Models3D
    models = relationship("Model3D", back_populates="owner")

class Model3D(Base):
    __tablename__ = "models_3d"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=True) # Mô tả Markdown từ AI
    glb_file_path = Column(String, nullable=False) # Đường dẫn file trên ổ đĩa
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="models")

# Hàm tạo bảng (chạy khi khởi động app)
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency để lấy session DB trong API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()