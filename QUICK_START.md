# MOVIEGAME - Hướng dẫn triển khai nhanh

Đây là phiên bản rút gọn của hướng dẫn triển khai đầy đủ. Để có hướng dẫn chi tiết, xem [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Yêu cầu tiên quyết

- Tài khoản AWS với CLI đã cấu hình
- Docker Desktop đã cài đặt
- Tên miền (tùy chọn nhưng khuyến nghị)

## 🚀 Triển khai nhanh (30 phút)

### Bước 1: Thiết lập hạ tầng AWS

```bash
# Clone và điều hướng đến dự án
git clone <your-repo-url>
cd MOVIEGAME

# Làm cho scripts có thể thực thi
chmod +x scripts/*.sh

# Thiết lập hạ tầng AWS (VPC, EC2, Security Groups, v.v.)
./scripts/setup-aws-infrastructure.sh
```

Điều này sẽ tạo:
- VPC với public subnet
- EC2 instance (t3.medium)
- Security groups
- Elastic IP
- ECR repositories
- SSH key pair

**Ghi chú địa chỉ Elastic IP từ output!**

### Bước 2: Cấu hình biến môi trường

```bash
# Tạo template môi trường
./scripts/setup-secrets.sh template

# Chỉnh sửa secrets.json với giá trị thực của bạn
nano secrets.json

# Tạo secrets mạnh
./scripts/setup-secrets.sh generate

# Lưu trữ secrets trong AWS (tùy chọn nhưng khuyến nghị)
./scripts/setup-secrets.sh store
```

**Secrets bắt buộc cần cập nhật trong `secrets.json`:**
- `FIREBASE_PRIVATE_KEY` - Từ Firebase service account của bạn
- `FIREBASE_CLIENT_EMAIL` - Từ Firebase service account của bạn
- `WEATHER_API_KEY` - API key thời tiết của bạn
- `MOVIE_DB_API_KEY` - API key Movie DB của bạn

### Bước 3: Triển khai ứng dụng

```bash
# Cập nhật script triển khai với EC2 IP của bạn
export REMOTE_HOST="YOUR_ELASTIC_IP_FROM_STEP_1"

# Triển khai ứng dụng
./scripts/deploy.sh

# Tùy chọn: Thiết lập chứng chỉ SSL
./scripts/deploy.sh --ssl
```

### Bước 4: Thiết lập giám sát (Tùy chọn)

```bash
# Thiết lập giám sát và logging
./scripts/setup-monitoring.sh
```

## 🎉 Hoàn thành!

Ứng dụng của bạn bây giờ sẽ chạy tại:
- **HTTP**: `http://YOUR_ELASTIC_IP`
- **HTTPS**: `https://yourdomain.com` (nếu đã cấu hình SSL)

## Lệnh nhanh

### Kiểm tra trạng thái ứng dụng
```bash
ssh -i moviegame-prod-key.pem ec2-user@YOUR_ELASTIC_IP
cd /opt/moviegame
sudo docker-compose -f docker-compose.prod.yml ps
```

### Xem Logs
```bash
ssh -i moviegame-prod-key.pem ec2-user@YOUR_ELASTIC_IP
cd /opt/moviegame
sudo docker-compose -f docker-compose.prod.yml logs -f
```

### Khởi động lại ứng dụng
```bash
ssh -i moviegame-prod-key.pem ec2-user@YOUR_ELASTIC_IP
cd /opt/moviegame
sudo docker-compose -f docker-compose.prod.yml restart
```

### Xem Dashboard giám sát
```bash
ssh -i moviegame-prod-key.pem ec2-user@YOUR_ELASTIC_IP
/opt/moviegame/monitor.sh
```

## Tham khảo biến môi trường

### Biến bắt buộc (.env.production)
```bash
# Application
NODE_ENV=production
PORT=5000
APP_URL=https://yourdomain.com

# Firebase (lấy từ Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=moviegame-9a57e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@moviegame-9a57e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# External APIs
WEATHER_API_KEY=your_weather_api_key
MOVIE_DB_API_KEY=your_movie_db_api_key

# Security
JWT_SECRET=your_generated_jwt_secret
SESSION_SECRET=your_generated_session_secret
CORS_ORIGIN=https://yourdomain.com
```

## Khắc phục sự cố

### Ứng dụng không khởi động
```bash
# Kiểm tra container logs
sudo docker-compose -f docker-compose.prod.yml logs

# Khởi động lại containers
sudo docker-compose -f docker-compose.prod.yml restart

# Rebuild nếu cần
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d
```

### Không thể kết nối đến EC2
```bash
# Kiểm tra security group cho phép IP của bạn
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# Cập nhật security group với IP hiện tại của bạn
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 22 \
    --cidr $MY_IP/32
```

### Vấn đề chứng chỉ SSL
```bash
# Kiểm tra trạng thái chứng chỉ
sudo certbot certificates

# Gia hạn chứng chỉ
sudo certbot renew --force-renewal

# Khởi động lại nginx
sudo docker-compose -f docker-compose.prod.yml restart frontend
```

### Sử dụng Memory/CPU cao
```bash
# Kiểm tra sử dụng tài nguyên
htop
docker stats

# Khởi động lại containers để giải phóng memory
sudo docker-compose -f docker-compose.prod.yml restart

# Dọn dẹp tài nguyên Docker
sudo docker system prune -f
```

## Thiết lập CI/CD (Tùy chọn)

### GitHub Actions
1. Thêm các secrets này vào GitHub repository của bạn:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `EC2_SSH_PRIVATE_KEY` (nội dung file .pem của bạn)
   - `EC2_HOST` (Elastic IP của bạn)

2. Push lên nhánh main để kích hoạt triển khai tự động

### Triển khai thủ công
```bash
# Cập nhật code và triển khai lại
git pull origin main
./scripts/deploy.sh
```

## Ước tính chi phí

**Chi phí AWS hàng tháng (ước tính):**
- EC2 t3.medium: $30-35
- Elastic IP: $3.65
- EBS storage (30GB): $3
- Data transfer: $5-10
- **Tổng: ~$40-50/tháng**

## Checklist bảo mật

- ✅ Truy cập SSH bị hạn chế theo IP của bạn
- ✅ Người dùng non-root trong containers
- ✅ Biến môi trường được bảo mật
- ✅ HTTPS được bật (nếu đã cấu hình SSL)
- ✅ Cập nhật bảo mật thường xuyên
- ✅ Firewall được cấu hình
- ✅ Tự động hóa backup

## Hỗ trợ

Để có hướng dẫn chi tiết và cấu hình nâng cao, xem:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Hướng dẫn triển khai đầy đủ
- [Tài liệu AWS](https://docs.aws.amazon.com/ec2/)
- [Tài liệu Docker](https://docs.docker.com/)
- [Tài liệu Firebase](https://firebase.google.com/docs/)

## Bước tiếp theo

1. **Domain tùy chỉnh**: Trỏ A record của domain về Elastic IP của bạn
2. **Chứng chỉ SSL**: Chạy `./scripts/deploy.sh --ssl` để có HTTPS
3. **Giám sát**: Thiết lập CloudWatch dashboards và alerts
4. **Backups**: Cấu hình lưu trữ backup S3
5. **CDN**: Thêm CloudFront để có hiệu suất tốt hơn
6. **Database**: Cân nhắc RDS cho nhu cầu database production

---

**Cần trợ giúp?** Kiểm tra phần khắc phục sự cố hoặc tham khảo hướng dẫn triển khai đầy đủ.
