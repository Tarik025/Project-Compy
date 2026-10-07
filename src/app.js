import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))

//cookies
app.use(cookieParser())


//cors configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5713", // Only allow your frontend
    credentials: true,// Crucial: Allows sending cookies/JWT auth headers across origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}))

// import the routes
import healthCheckRouter from "./routes/healthCheck.route.js";
app.use("/api/v1/healthcheck", healthCheckRouter)

import authRouter from "./routes/auth.routes.js"
app.use("/api/v1/auth", authRouter)



app.get("/", (req, res) => {
    res.send("this is a page created by Tarik")
});

export default app;