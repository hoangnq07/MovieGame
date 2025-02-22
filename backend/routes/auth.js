const express = require("express");
const admin = require("../firebaseConfig");
const jwt = require("jsonwebtoken");
const router = express.Router();

const JWT_SECRET = "1237173917382"; // 🔐 Đổi thành key bảo mật thực tế

// 📌 Xác minh ID Token từ Google/Facebook và tạo JWT
router.post("/social-login", async (req, res) => {
  const { idToken } = req.body;

  try {
    // ✅ Xác minh ID Token từ Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // ✅ Tạo JWT của riêng server để quản lý session
    const jwtToken = jwt.sign(
      { uid: decodedToken.uid, email: decodedToken.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ success: true, token: jwtToken });
  } catch (error) {
    console.error("Social Login Error:", error);
    res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
});

module.exports = router;
