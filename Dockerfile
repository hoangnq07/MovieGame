# Sử dụng image Java 17
FROM openjdk:17-jdk-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Copy file Maven và project
COPY pom.xml .  
COPY src ./src

# Build project
RUN ./mvnw clean package -DskipTests

# Mở cổng cho Render
EXPOSE 10000

# Lệnh chạy app
CMD ["java", "-jar", "target/moviegameapp-0.0.1-SNAPSHOT.jar"]
