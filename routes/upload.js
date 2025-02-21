const express = require("express");
const sharp = require("sharp");
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const axios = require("axios");
const streamifier = require("streamifier");

const router = express.Router();

const sizes = [
    { width: 300, height: 250, name: "300x250" },
    { width: 728, height: 90, name: "728x90" },
    { width: 160, height: 600, name: "160x600" },
    { width: 300, height: 600, name: "300x600" },
];

// Function to upload resized images to Cloudinary using Promises
const uploadToCloudinary = (buffer, sizeName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "resized", format: "png", public_id: `${sizeName}-${Date.now()}` },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

router.post("/", upload.single("image"), async (req, res) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const originalImageUrl = req.file.path;
    console.log("File uploaded to Cloudinary:", originalImageUrl);

    try {
        console.log("Fetching image from Cloudinary...");

        // Fetch image from Cloudinary
        const response = await axios({
            url: originalImageUrl,
            responseType: "arraybuffer",
        });

        const imageBuffer = Buffer.from(response.data);

        console.log("Starting image processing...");
        const resizedImages = await Promise.all(
            sizes.map(async (size) => {
                try {
                    // Resize image
                    const resizedBuffer = await sharp(imageBuffer)
                        .resize(size.width, size.height)
                        .toBuffer();

                    // Upload to Cloudinary
                    const url = await uploadToCloudinary(resizedBuffer, size.name);
                    return { size: size.name, url };
                } catch (resizeError) {
                    console.error(`Error resizing to ${size.name}:`, resizeError);
                    return null;
                }
            })
        );

        console.log("Processing complete. Sending response.");
        res.json({ success: true, images: resizedImages.filter((img) => img !== null) });
    } catch (error) {
        console.error("Unexpected error processing image:", error);
        res.status(500).json({ error: "Image processing failed" });
    }
});

module.exports = router;
