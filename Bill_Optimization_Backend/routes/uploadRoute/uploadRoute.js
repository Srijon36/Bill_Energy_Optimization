const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/uploadMiddleware/uploadMiddleware");

// Upload bill file
router.post("/upload-bill", upload.single("bill"), (req, res) => {
  res.json({
    success: true,
    message: "File uploaded successfully",
    file: req.file
  });
});

module.exports = router;