const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/uploadMiddleware/uploadMiddleware");
const { scanAndCreateBill } = require("../../controllers/uploadController/uploadController");
const { protect } = require("../../middlewares/authMiddleware/authMiddleware");

// ✅ scan bill — OCR + AI + save to DB
router.post("/scan-bill", protect, upload.single("file"), scanAndCreateBill);

module.exports = router;