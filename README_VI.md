# MOVIEGAME 🎬🎮

Ứng dụng web hiện đại kết hợp khám phá phim ảnh, yếu tố game và tính năng xã hội. Được xây dựng với React frontend và Node.js backend, tích hợp xác thực Firebase và dữ liệu thời gian thực.

## 🌟 Tính năng

- **Khám phá phim**: Duyệt phim phổ biến với thông tin chi tiết
- **Tích hợp thời tiết**: Dữ liệu thời tiết thời gian thực để nâng cao trải nghiệm người dùng
- **Tạo câu trích dẫn**: Câu trích dẫn truyền cảm hứng hàng ngày với bản dịch
- **Xác thực người dùng**: Đăng nhập bảo mật với Firebase Auth (Google, Facebook)
- **Thiết kế responsive**: Thiết kế mobile-first với UI/UX hiện đại
- **Dữ liệu thời gian thực**: Cập nhật trực tiếp và tính năng tương tác

## 🏗️ Kiến trúc

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Node.js + Express + Firebase Admin
- **Cơ sở dữ liệu**: Firebase Firestore
- **Xác thực**: Firebase Auth
- **Triển khai**: Docker + AWS EC2
- **Giám sát**: CloudWatch + Dashboard tùy chỉnh

## 🚀 Bắt đầu nhanh

### Phát triển cục bộ
```bash
# Clone repository
git clone <your-repo-url>
cd MOVIEGAME

# Cài đặt dependencies
cd backend && npm install
cd ../frontend && npm install

# Khởi động development servers
cd backend && npm run dev
cd ../frontend && npm run dev
```

### Triển khai Production
Xem hướng dẫn triển khai toàn diện của chúng tôi:
- **[Hướng dẫn bắt đầu nhanh](./QUICK_START.md)** - Triển khai trong 30 phút
- **[Hướng dẫn triển khai đầy đủ](./DEPLOYMENT_GUIDE.md)** - Thiết lập production hoàn chỉnh

## 📁 Cấu trúc dự án

```
MOVIEGAME/
├── 📂 backend/                 # Node.js API server
│   ├── 📄 server.js           # File server chính
│   ├── 📂 routes/             # API routes
│   ├── 📄 Dockerfile.prod     # Cấu hình Docker production
│   └── 📄 package.json        # Dependencies backend
├── 📂 frontend/               # Ứng dụng React
│   ├── 📂 src/                # Mã nguồn
│   ├── 📂 public/             # Tài nguyên tĩnh
│   ├── 📄 Dockerfile.prod     # Cấu hình Docker production
│   └── 📄 package.json        # Dependencies frontend
├── 📂 scripts/                # Tự động hóa triển khai
│   ├── 📄 deploy.sh           # Script triển khai chính
│   ├── 📄 setup-aws-infrastructure.sh
│   ├── 📄 setup-monitoring.sh
│   └── 📄 setup-secrets.sh
├── 📂 .github/workflows/      # CI/CD pipelines
├── 📄 docker-compose.prod.yml # Docker Compose production
├── 📄 DEPLOYMENT_GUIDE.md     # Hướng dẫn triển khai đầy đủ
└── 📄 QUICK_START.md          # Hướng dẫn triển khai nhanh
```

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 19** - React hiện đại với tính năng mới nhất
- **Vite** - Công cụ build nhanh và dev server
- **TailwindCSS** - CSS framework utility-first
- **React Router** - Định tuyến phía client
- **Axios** - HTTP client cho API calls
- **Chart.js** - Trực quan hóa dữ liệu
- **React Icons** - Thư viện icon

### Backend
- **Node.js 18** - JavaScript runtime
- **Express.js** - Web framework
- **Firebase Admin** - Firebase SDK phía server
- **CORS** - Chia sẻ tài nguyên cross-origin
- **dotenv** - Quản lý biến môi trường
- **JWT** - JSON Web Tokens cho xác thực

### Hạ tầng
- **Docker** - Containerization
- **AWS EC2** - Cloud hosting
- **Nginx** - Reverse proxy và phục vụ file tĩnh
- **CloudWatch** - Giám sát và logging
- **Let's Encrypt** - Chứng chỉ SSL

## 🔧 Thiết lập phát triển

### Yêu cầu tiên quyết
- Node.js 18+
- Docker Desktop
- Dự án Firebase
- API keys (Weather, Movie DB)

### Cấu hình môi trường
1. Sao chép template môi trường:
   ```bash
   cp .env.production.example .env.production
   ```

2. Cập nhật với giá trị của bạn:
   - Thông tin đăng nhập Firebase
   - API keys
   - Security secrets

### Chạy cục bộ
```bash
# Backend (Port 5000)
cd backend
npm install
npm run dev

# Frontend (Port 3000)
cd frontend
npm install
npm run dev
```

## 🚀 Triển khai Production

### Tùy chọn 1: Triển khai nhanh (Khuyến nghị)
```bash
# Thiết lập hạ tầng AWS
./scripts/setup-aws-infrastructure.sh

# Cấu hình secrets
./scripts/setup-secrets.sh template
# Chỉnh sửa secrets.json với giá trị của bạn
./scripts/setup-secrets.sh generate

# Triển khai ứng dụng
REMOTE_HOST=YOUR_EC2_IP ./scripts/deploy.sh --ssl
```

### Tùy chọn 2: Triển khai thủ công
Xem [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) để có hướng dẫn từng bước.

### Tùy chọn 3: CI/CD Pipeline
1. Cấu hình GitHub secrets
2. Push lên nhánh main
3. Triển khai tự động qua GitHub Actions

## 📊 Giám sát & Bảo trì

### Giám sát sức khỏe
- **Health Checks**: Tự động mỗi 5 phút
- **CloudWatch**: Metrics hệ thống và logs
- **Dashboard tùy chỉnh**: Trạng thái ứng dụng thời gian thực
- **Cảnh báo**: Thông báo email khi có vấn đề

### Chiến lược sao lưu
- **Sao lưu hàng ngày**: Tự động lúc 2 giờ sáng UTC
- **Lưu trữ**: 30 ngày
- **Nơi lưu**: Local + tùy chọn S3
- **Khôi phục**: Scripts khôi phục tự động

### Quản lý Log
- **Application Logs**: Logging JSON có cấu trúc
- **Access Logs**: Nginx request logs
- **Error Logs**: Theo dõi lỗi tập trung
- **Rotation**: Rotation hàng ngày với nén

## 🔒 Tính năng bảo mật

- **HTTPS**: Mã hóa SSL/TLS
- **Xác thực**: Tích hợp Firebase Auth
- **Ủy quyền**: Bảo mật API dựa trên JWT
- **CORS**: Cấu hình cho domain production
- **Rate Limiting**: Bảo vệ API endpoint
- **Security Headers**: Bảo vệ XSS, CSRF
- **Container Security**: Người dùng non-root, filesystem chỉ đọc
- **Network Security**: VPC, security groups, firewall

## 📈 Tối ưu hóa hiệu suất

- **Docker Multi-stage Builds**: Images production tối thiểu
- **Nginx Caching**: Tối ưu hóa tài nguyên tĩnh
- **Gzip Compression**: Giảm sử dụng băng thông
- **CDN Ready**: Hỗ trợ tích hợp CloudFront
- **Database Optimization**: Tối ưu hóa truy vấn Firebase
- **Resource Limits**: Quản lý tài nguyên container

## 🧪 Kiểm thử

### Chạy Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Docker build tests
docker build -f backend/Dockerfile.prod -t test-backend ./backend
docker build -f frontend/Dockerfile.prod -t test-frontend ./frontend
```

### CI/CD Testing
- **Unit Tests**: Tự động trên mỗi commit
- **Integration Tests**: Kiểm thử API endpoint
- **Security Scans**: Phát hiện lỗ hổng bảo mật
- **Smoke Tests**: Xác minh sau triển khai

## 📝 Tài liệu API

### Authentication Endpoints
- `POST /api/auth/login` - Đăng nhập người dùng
- `POST /api/auth/logout` - Đăng xuất người dùng
- `GET /api/auth/profile` - Lấy thông tin người dùng

### Application Endpoints
- `GET /api/quotes/random-quote` - Lấy câu trích dẫn ngẫu nhiên
- `GET /health` - Kiểm tra sức khỏe ứng dụng
- `GET /health/firebase` - Kiểm tra kết nối Firebase

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Thực hiện thay đổi
4. Thêm tests nếu có thể
5. Gửi pull request

## 📄 Giấy phép

Dự án này được cấp phép theo MIT License - xem file LICENSE để biết chi tiết.

## 🆘 Hỗ trợ

### Tài liệu
- [Hướng dẫn bắt đầu nhanh](./QUICK_START.md)
- [Hướng dẫn triển khai](./DEPLOYMENT_GUIDE.md)
- [Khắc phục sự cố](./DEPLOYMENT_GUIDE.md#troubleshooting)

### Nhận trợ giúp
- Kiểm tra phần khắc phục sự cố
- Xem lại application logs
- Liên hệ nhóm phát triển

## 🎯 Lộ trình

- [ ] Phát triển ứng dụng mobile
- [ ] Tính năng gaming nâng cao
- [ ] Khả năng chia sẻ xã hội
- [ ] Analytics nâng cao
- [ ] Hỗ trợ đa ngôn ngữ
- [ ] Chức năng offline

---

**Được xây dựng với ❤️ bởi MOVIEGAME Team**
