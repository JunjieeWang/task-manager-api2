/** app.js */
require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const helmet   = require("helmet");
const mongoose = require("mongoose");

// Rutes
const authRoutes       = require("./routes/authRoutes");
const taskRoutes       = require("./routes/taskRoutes");
const adminRoutes      = require("./routes/adminRoutes");
const userRoutes       = require("./routes/userRoutes");
const roleRoutes       = require("./routes/roleRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const delegationRoutes = require("./routes/delegationRoutes");
const auditRoutes      = require("./routes/auditRoutes");

const { notFound, errorHandler } = require("./middleware/errorHandler");
const { runSeed } = require("./utils/seedData");

const app = express();

// ============================================
// MIDDLEWARES GLOBALS
// ============================================
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// HEALTH CHECK
// ============================================
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "task-manager-api",
    version: "T9 - JWT Avançat + Jerarquia de Rols"
  });
});

// ============================================
// RUTES DE L'API
// ============================================
app.use("/api/auth",        authRoutes);
app.use("/api/tasks",       taskRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/roles",       roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/delegations", delegationRoutes);
app.use("/api/audit",       auditRoutes);

// Rutes d'administració (legacy, es mantenen)
app.use("/api/admin",       adminRoutes);

// ============================================
// GESTIÓ D'ERRORS
// ============================================
app.use(notFound);
app.use(errorHandler);

// ============================================
// ARRENCADA
// ============================================
async function start() {
  const port      = process.env.PORT || 3000;
  const mongoUri  = process.env.MONGO_JJ;
  const autoSeed  = process.env.AUTO_SEED === "true";

  if (!mongoUri) throw new Error("MONGO_JJ no està configurat a .env");

  await mongoose.connect(mongoUri);
  console.log("MongoDB connectat");

  if (autoSeed) {
    console.log("\nAuto-seed habilitat. Executant seed...");
    try { await runSeed(); } catch (err) { console.error("Error en auto-seed:", err.message); }
  }

  app.listen(port, () => {
    console.log(`\nAPI escoltant al port ${port}`);
    console.log(`   Versió: T9 - JWT Avançat + Jerarquia de Rols`);
    console.log(`   Helmet: activat`);
    console.log(`   Rate Limiting: activat`);
    console.log(`   Auto-seed: ${autoSeed ? "Activat" : "Desactivat"}`);
  });
}

start().catch((err) => {
  console.error("Error iniciant servidor:", err);
  process.exit(1);
});
