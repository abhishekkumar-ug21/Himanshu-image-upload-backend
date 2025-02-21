const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());


const processedDir = path.join(__dirname, "processed");

// Ensure the processed directory exists
if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
}
app.use("/processed", express.static(path.join(__dirname, "processed")));


const upload = multer({ dest: "uploads/" });

const sizes = [
    { width: 300, height: 250, name: "300x250" },
    { width: 728, height: 90, name: "728x90" },
    { width: 160, height: 600, name: "160x600" },
    { width: 300, height: 600, name: "300x600" },
];

app.post("/upload", upload.single("image"), async (req, res) => {
    console.log("Upload endpoint hit");

    if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", req.file.filename);

    const resizedImages = [];

    try {
        console.log("Starting image processing...");
        await Promise.all(
            sizes.map(async (size) => {
                try {
                    const outputPath = `processed/${size.name}-${req.file.filename}.png`;
                    console.log(`Resizing image to ${size.name}: ${size.width}x${size.height}`);

                    await sharp(req.file.path)
                        .resize(size.width, size.height)
                        .toFormat("png")
                        .toFile(outputPath);

                    console.log(`Image resized successfully: ${outputPath}`);
                    resizedImages.push({ size: size.name, url: `http://localhost:${PORT}/${outputPath}` });
                } catch (resizeError) {
                    console.error(`Error resizing to ${size.name}:`, resizeError);
                }
            })
        );

        console.log("Removing original file:", req.file.path);
        fs.unlinkSync(req.file.path);

        console.log("Processing complete. Sending response.");
        res.json({ success: true, images: resizedImages });
    } catch (error) {
        console.error("Unexpected error processing image:", error);
        res.status(500).json({ error: "Image processing failed" });
    }
});

app.use("/processed", express.static(path.join(__dirname, "processed")));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
