import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import authRoutes from "./presentation/routes/auth.routes.js";
import documentRoutes from "./presentation/routes/document.routes.js";

const app: Application = express();

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.resolve("uploads")));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

// Middleware de error
app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message });
});

export default app;
