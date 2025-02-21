const express = require("express");
const sharp = require("sharp");
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const axios = require("axios");

const router = express.Router();

const sizes = [
    { width: 300, height: 250, name: "300x250" },
    { width: 728, height: 90, name: "728x90" },
    { width: 160, height: 600, name: "160x600" },
    { width: 300, height: 600, name: "300x600" },
];

router.post("/", upload.single("image"), async (req, res) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const originalImageUrl = req.file.path; // Cloudinary image URL
    console.log("File uploaded to Cloudinary:", originalImageUrl);

    const resizedImages = [];

    try {
        console.log("Fetching image from Cloudinary...");
        
        // Fetch image from Cloudinary
        const response = await axios({
            url: originalImageUrl,
            responseType: "arraybuffer", // Get binary data
        });

        const imageBuffer = Buffer.from(response.data); // Convert to Buffer

        console.log("Starting image processing...");
        await Promise.all(
            sizes.map(async (size) => {
                try {
                    // Resize image with Sharp
                    const resizedBuffer = await sharp(imageBuffer)
                        .resize(size.width, size.height)
                        .toBuffer();

                    // Upload resized image to Cloudinary
                    const result = await cloudinary.uploader.upload_stream(
                        { folder: "resized", format: "png" },
                        (error, cloudinaryResult) => {
                            if (error) {
                                console.error("Cloudinary upload error:", error);
                            } else {
                                resizedImages.push({
                                    size: size.name,
                                    url: cloudinaryResult.secure_url,
                                });
                            }
                        }
                    ).end(resizedBuffer);

                } catch (resizeError) {
                    console.error(`Error resizing to ${size.name}:`, resizeError);
                }
            })
        );

        console.log("Processing complete. Sending response.");
        res.json({ success: true, images: resizedImages });
    } catch (error) {
        console.error("Unexpected error processing image:", error);
        res.status(500).json({ error: "Image processing failed" });
    }
});

module.exports = router;
