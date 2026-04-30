const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const appRedirects = [
  "360Do",
  "360Docs",
  "360Draw",
  "360Music",
  "360Notes",
  "360mail",
  "360vids",
  "360zone",
];

appRedirects.forEach((name) => {
  app.get(`/${name}`, (req, res) => res.redirect(302, `/apps/${name}.html`));
  app.get(`/${name}.html`, (req, res) => res.redirect(302, `/apps/${name}.html`));
});

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
