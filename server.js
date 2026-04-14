const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Enable CORS
app.use(cors());

// Serve EVERYTHING in the root folder
app.use(express.static(__dirname));

// Serve assets (html, css, js, images, etc.)
app.use("/assets", express.static(path.join(__dirname, "assets")));

// SPA fallback — ANY unknown route loads index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`360 Platform running on port ${PORT}`);
});
