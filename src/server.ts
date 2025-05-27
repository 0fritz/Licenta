import express from "express";
import cors from "cors";
import routes from "./routes/routes"; // Make sure this path is correct
import path from "path";

const app = express();

// Allow all CORS requests
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Use the routes defined in routes.ts
app.use(routes);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
