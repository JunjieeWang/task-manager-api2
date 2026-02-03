/** task-manager-api/app.js */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Importem les rutes
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Importem els middlewares de gestió d'errors
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Importem el seed
const { runSeed } = require("./utils/seedData");

// Creem l'aplicació Express
const app = express();

// ============================================
// MIDDLEWARES GLOBALS
// ============================================

// Habilitem CORS
app.use(cors());

// Parsejem JSON
app.use(express.json());

// ============================================
// RUTA PRINCIPAL (Health Check)
// ============================================

app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    service: "task-manager-api",
    version: "T8 - Sistema de Rols i Permisos"
  });
});

// ============================================
// RUTES DE L'API
// ============================================

// Rutes d'autenticació
app.use("/api/auth", authRoutes);

// Rutes de tasques
app.use("/api/tasks", taskRoutes);

// Rutes d'administració
app.use("/api/admin", adminRoutes);

// ============================================
// MIDDLEWARES DE GESTIÓ D'ERRORS
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// FUNCIÓ D'INICI DEL SERVIDOR
// ============================================

async function start() {
  const port = process.env.PORT || 3000;
  const mongoUri = process.env.MONGO_JJ;
  const autoSeed = process.env.AUTO_SEED === "true";

  if (!mongoUri) {
    throw new Error("MONGO_JJ no està configurat a .env");
  }

  // Connectem a MongoDB
  await mongoose.connect(mongoUri);
  console.log("MongoDB connectat");

  // Executem el seed automàticament si està habilitat
  if (autoSeed) {
    console.log("\nAuto-seed habilitat. Executant seed...");
    try {
      await runSeed();
    } catch (err) {
      console.error("Error en auto-seed:", err.message);
    }
  }

  // Iniciem el servidor
  app.listen(port, () => {
    console.log(`\nAPI escoltant al port ${port}`);
    console.log(`   Versió: T8 - Sistema de Rols i Permisos`);
    console.log(`   Auto-seed: ${autoSeed ? "Activat" : "Desactivat"}`);
  });
}

start().catch((err) => {
  console.error("Error iniciant servidor:", err);
  process.exit(1);
});
