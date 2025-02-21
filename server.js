const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Import and use upload route
const uploadRoutes = require("./routes/upload");
app.use("/upload", uploadRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
