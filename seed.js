/** task-manager-api/seed.js */
/**
 * Script per inicialitzar el sistema T8
 * 
 * Executa amb: node seed.js
 * 
 * Crea:
 * - Permisos del sistema
 * - Rols per defecte (admin, user, viewer, editor)
 * - Migra usuaris existents sense rols
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { runSeed } = require("./utils/seedData");

async function main() {
  try {
    // Connectem a MongoDB
    const mongoUri = process.env.MONGO_JJ;
    
    if (!mongoUri) {
      throw new Error("MONGO_JJ no està configurat al fitxer .env");
    }
    
    console.log("Connectant a MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connectat a MongoDB\n");
    
    // Executem el seed
    await runSeed();
    
    // Tanquem la connexió
    await mongoose.disconnect();
    console.log("Connexió tancada");
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
