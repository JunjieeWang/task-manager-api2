# Task Manager API - T8: Sistema Avançat de Rols i Permisos

API REST per gestionar tasques amb un sistema avançat de control d'accés basat en rols (RBAC) i auditoria completa d'accions.

## Taula de Continguts

- [Característiques](#característiques)
- [Sistema de Permisos](#sistema-de-permisos)
- [Diagrama de Relacions](#diagrama-de-relacions)
- [Estructura del Projecte](#estructura-del-projecte)
- [Instal·lació i Setup](#installació-i-setup)
- [Ús de l'API](#ús-de-lapi)
- [Exemples d'Ús](#exemples-dús)
- [Gestió d'Errors](#gestió-derrors)
- [Col·lecció de Postman](#collecció-de-postman)
- [Tecnologies](#tecnologies)
- [Scripts Disponibles](#scripts-disponibles)
- [Seguretat](#seguretat)
- [Autors](#autors)

---

## Característiques

### Autenticació i Autorització
- Sistema JWT per autenticació
- Control d'accés basat en rols (RBAC)
- Permisos granulars per acció
- Middleware de verificació de permisos

### Gestió d'Usuaris i Rols
- CRUD complet d'usuaris (només admin)
- Sistema multi-rol per usuari
- Rols personalitzables amb permisos específics
- 4 rols per defecte: admin, user, editor, viewer

### Gestió de Tasques
- CRUD complet de tasques
- Cada usuari només veu les seves pròpies tasques
- Estadístiques de tasques per usuari
- Suport per imatges
- Control de permisos per cada acció

### Sistema d'Auditoria
- Registre automàtic de totes les accions
- Informació detallada: usuari, acció, recurs, IP, timestamp
- Endpoints per consultar historial
- Filtres per usuari, acció i estat
- Estadístiques d'ús del sistema

### Permisos Granulars
- 11 permisos diferents agrupats per categories
- Sistema extensible per afegir nous permisos
- Assignació flexible de permisos a rols
- Verificació en temps real

---

## Sistema de Permisos

### Conceptes Clau

El sistema de permisos està basat en tres entitats principals:

1. **Permisos**: Accions atòmiques que es poden realitzar (ex: `tasks:create`)
2. **Rols**: Conjunts de permisos que defineixen un perfil (ex: `editor`)
3. **Usuaris**: Poden tenir múltiples rols assignats

### Permisos Disponibles

Els permisos segueixen la nomenclatura `recurs:acció`:

#### Tasques (Tasks)
```
tasks:create    - Crear noves tasques
tasks:read      - Veure tasques pròpies
tasks:update    - Editar tasques pròpies
tasks:delete    - Eliminar tasques pròpies
```

#### Usuaris (Users)
```
users:read      - Veure llista d'usuaris
users:manage    - Crear, editar i eliminar usuaris
```

#### Rols (Roles)
```
roles:read      - Veure rols disponibles
roles:manage    - Crear, editar i eliminar rols
```

#### Permisos (Permissions)
```
permissions:read     - Veure permisos disponibles
permissions:manage   - Crear, editar i eliminar permisos
```

#### Auditoria (Audit)
```
audit:read      - Veure registres d'auditoria
```

### Rols per Defecte

| Rol | Descripció | Permisos | Editable |
|-----|------------|----------|----------|
| **admin** | Administrador complet | TOTS els permisos | No |
| **user** | Usuari estàndard | `tasks:*` | No |
| **editor** | Editor amb accés ampliat | `tasks:*`, `users:read` | Sí |
| **viewer** | Només lectura | `tasks:read` | Sí |

### Flux de Verificació de Permisos

```
1. Usuari fa una petició
     ↓
2. Middleware auth verifica el token JWT
     ↓
3. Carrega els rols de l'usuari des de la BD
     ↓
4. Agrega tots els permisos dels rols
     ↓
5. Middleware checkPermission verifica el permís requerit
     ↓
6. Si té permís → Continua a l'endpoint
   Si no té permís → 403 Forbidden
```

### Exemple de Verificació

```javascript
// Ruta protegida amb checkPermission
router.post("/tasks", 
  auth,                           // 1. Verifica autenticació
  checkPermission("tasks:create"), // 2. Verifica permís específic
  auditLog("tasks:create"),       // 3. Registra l'acció
  createTask                      // 4. Executa el controlador
);
```

---

## Diagrama de Relacions

### Relacions entre Models

```
┌─────────────────┐
│      User       │
│─────────────────│
│ _id             │
│ name            │
│ email           │
│ password        │
│ roles: [Rol]    │◄────┐
│ role (legacy)   │     │
│ createdAt       │     │
└─────────────────┘     │
                        │ N:N
                        │
┌─────────────────┐     │
│      Role       │─────┘
│─────────────────│
│ _id             │
│ name            │
│ description     │
│ permissions:    │◄────┐
│   [Permission]  │     │
│ isSystem        │     │
│ createdAt       │     │ N:N
└─────────────────┘     │
                        │
┌─────────────────┐     │
│   Permission    │─────┘
│─────────────────│
│ _id             │
│ name            │
│ description     │
│ category        │
│ isSystem        │
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│      Task       │
│─────────────────│
│ _id             │
│ user: User      │──────┐ N:1
│ title           │      │
│ description     │      │
│ cost            │      │
│ hours_estimated │      │
│ completed       │      │
│ image           │      │
│ createdAt       │      │
│ updatedAt       │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│    AuditLog     │      │
│─────────────────│      │
│ _id             │      │
│ user: User      │◄─────┘ N:1
│ action          │
│ resourceType    │
│ resourceId      │
│ resourceDetails │
│ changes         │
│ status          │
│ errorDetails    │
│ ipAddress       │
│ userAgent       │
│ timestamp       │
└─────────────────┘
```

### Flux de Dades

```
1. REGISTRE D'USUARI
   User.create() → Assigna rol "user" → Token JWT

2. LOGIN
   User.findOne() → Verifica password → Carrega rols → Token JWT

3. PETICIÓ PROTEGIDA
   Token → auth middleware → Carrega User + roles + permissions → checkPermission → Endpoint

4. ACCIÓ AMB AUDITORIA
   Endpoint → Acció exitosa → auditLog middleware → AuditLog.create()

5. GESTIÓ DE ROLS
   Admin → Crea/Modifica Role → Assigna Permissions → Usuaris hereten permisos
```

---

## Estructura del Projecte

```
task-manager-api/
│
├── .env                          # Variables d'entorn
├── .gitignore                    # Fitxers a ignorar
├── package.json                  # Dependències
├── app.js                        # MODIFICAT - Noves rutes
├── seed.js                       # NOU - Script per executar el seed
│
├── models/
│   ├── User.js                   # MODIFICAT - roles: [ObjectId]
│   ├── Task.js                   # Sense canvis
│   ├── Role.js                   # NOU - Model de rols
│   ├── Permission.js             # NOU - Model de permisos
│   └── AuditLog.js               # NOU - Model d'auditoria
│
├── controllers/
│   ├── authController.js         # MODIFICAT - checkPermission endpoint
│   ├── taskController.js         # Sense canvis (auditoria via middleware)
│   ├── adminController.js        # NOU - Gestió d'usuaris
│   ├── roleController.js         # NOU - CRUD de rols
│   ├── permissionController.js   # NOU - CRUD de permisos
│   └── auditController.js        # NOU - Consulta d'auditoria
│
├── middleware/
│   ├── auth.js                   # MODIFICAT - Carregar rols i permisos
│   ├── checkPermission.js        # NOU - Verificar permisos dinàmics
│   ├── auditLog.js               # NOU - Registrar accions
│   ├── errorHandler.js           # Sense canvis
│   └── validators/
│       ├── _common.js            # Sense canvis
│       ├── authValidators.js     # Sense canvis
│       ├── taskValidators.js     # Sense canvis
│       └── roleValidators.js     # NOU - Validadors de rols
│
├── routes/
│   ├── authRoutes.js             # MODIFICAT - Nou endpoint check-permission
│   ├── taskRoutes.js             # MODIFICAT - checkPermission middleware
│   └── adminRoutes.js            # MODIFICAT - Rutes de rols/permisos/audit
│
└── utils/
    ├── errorResponse.js          # Sense canvis
    ├── generateToken.js          # Sense canvis
    └── seedData.js               # NOU - Crear permisos i rols per defecte
```

### Resum de Canvis

| Tipus | Quantitat |
|-------|-----------|
| Fitxers nous | 12 |
| Fitxers modificats | 6 |
| Fitxers sense canvis | 7 |
| TOTAL | 25 fitxers |

---

## Installació i Setup

### 1. Prerequisits

- Node.js 18+
- MongoDB 5.0+
- npm o yarn

### 2. Clonar el Repositori

```bash
git clone <repository-url>
cd task-manager-api
```

### 3. Instal·lar Dependències

```bash
npm install
```

### 4. Configurar Variables d'Entorn

Crea un fitxer `.env` a l'arrel del projecte:

```env
# MongoDB
MONGO_JJ=mongodb://localhost:27017/task-manager-t8

# JWT
JWT_SECRET=el_teu_secret_super_segur_aqui_min_32_caracteres
JWT_EXPIRE=7d

# Server
PORT=3000
NODE_ENV=development
```

### 5. Inicialitzar la Base de Dades

Executa el seed per crear permisos, rols i usuaris de prova:

```bash
node seed.js
```

Sortida esperada:
```
========================================
INICIANT SEED DEL SISTEMA T8
========================================

Creant permisos del sistema...
   Permisos creats: 11

Creant rols del sistema...
   Rols creats: 4

Migrant usuaris sense rols...
   Usuaris migrats: 0

Creant usuaris de prova...
   Creat: admin@example.com (password: admin123)
   Creat: editor@example.com (password: editor123)
   Creat: user@example.com (password: user123)

========================================
SEED COMPLETAT AMB EXIT
========================================

CREDENCIALS DE PROVA:
   Admin:  admin@example.com / admin123
   Editor: editor@example.com / editor123
   User:   user@example.com / user123
========================================
```

### 6. Iniciar el Servidor

```bash
npm start
```

El servidor estarà disponible a `http://localhost:3000`

### 7. Verificar que Funciona

Prova l'endpoint de salut:

```bash
curl http://localhost:3000/
```

Resposta esperada:
```json
{
  "ok": true,
  "service": "task-manager-api"
}
```

---

## Ús de l'API

### Base URL

```
http://localhost:3000/api
```

### Autenticació

Totes les rutes protegides requereixen un token JWT al header:

```http
Authorization: Bearer <token>
```

### Endpoints Principals

#### Autenticació

```http
POST   /api/auth/register           # Registrar nou usuari
POST   /api/auth/login              # Iniciar sessió
GET    /api/auth/me                 # Obtenir perfil
PUT    /api/auth/profile            # Actualitzar perfil
PUT    /api/auth/change-password    # Canviar contrasenya
POST   /api/auth/check-permission   # Verificar permís
GET    /api/auth/my-permissions     # Llistar permisos
```

#### Tasques

```http
GET    /api/tasks                   # Llistar tasques pròpies
POST   /api/tasks                   # Crear tasca
GET    /api/tasks/:id               # Obtenir una tasca
PUT    /api/tasks/:id               # Actualitzar tasca
DELETE /api/tasks/:id               # Eliminar tasca
GET    /api/tasks/stats             # Estadístiques
PUT    /api/tasks/:id/image         # Pujar imatge
PUT    /api/tasks/:id/image/reset   # Eliminar imatge
```

#### Administració - Usuaris

```http
GET    /api/admin/users                      # Llistar tots els usuaris
GET    /api/admin/users/:id                  # Obtenir un usuari
DELETE /api/admin/users/:id                  # Eliminar usuari
POST   /api/admin/users/:id/roles            # Assignar rol
DELETE /api/admin/users/:id/roles/:roleId    # Treure rol
GET    /api/admin/users/:id/permissions      # Permisos d'usuari
GET    /api/admin/tasks                      # Totes les tasques
```

#### Administració - Rols

```http
GET    /api/admin/roles                   # Llistar rols
POST   /api/admin/roles                   # Crear rol
GET    /api/admin/roles/:id               # Obtenir rol
PUT    /api/admin/roles/:id               # Actualitzar rol
DELETE /api/admin/roles/:id               # Eliminar rol
POST   /api/admin/roles/:id/permissions   # Afegir permisos
DELETE /api/admin/roles/:id/permissions   # Treure permisos
```

#### Administració - Permisos

```http
GET    /api/admin/permissions                 # Llistar permisos
POST   /api/admin/permissions                 # Crear permís
GET    /api/admin/permissions/categories      # Categories
GET    /api/admin/permissions/:id            # Obtenir permís
PUT    /api/admin/permissions/:id            # Actualitzar permís
DELETE /api/admin/permissions/:id            # Eliminar permís
GET    /api/admin/permissions/:id/roles      # Rols amb permís
```

#### Administració - Auditoria

```http
GET    /api/admin/audit-logs               # Registres d'auditoria
GET    /api/admin/audit-logs/:id           # Un registre
GET    /api/admin/audit-logs/stats         # Estadístiques
GET    /api/admin/audit-logs/recent        # Activitat recent
GET    /api/admin/audit-logs/errors        # Errors recents
GET    /api/admin/audit-logs/user/:userId  # Historial d'usuari
```

---

## Exemples d'Ús

### 1. Registre i Login

#### Registrar un nou usuari

```bash
curl -X POST http://localhost:3000/api/auth/register   -H "Content-Type: application/json"   -d '{
    "name": "Joan Garcia",
    "email": "joan@example.com",
    "password": "contrasenya123"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "675c...",
    "name": "Joan Garcia",
    "email": "joan@example.com",
    "roles": ["user"],
    "permissions": ["tasks:create", "tasks:read", "tasks:update", "tasks:delete"]
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login   -H "Content-Type: application/json"   -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 2. Gestió de Tasques

#### Crear una tasca

```bash
curl -X POST http://localhost:3000/api/tasks   -H "Content-Type: application/json"   -H "Authorization: Bearer <token>"   -d '{
    "title": "Dissenyar logo corporatiu",
    "description": "Crear un logo modern i atractiu",
    "cost": 300,
    "hours_estimated": 8
  }'
```

#### Llistar les meves tasques

```bash
curl -X GET http://localhost:3000/api/tasks   -H "Authorization: Bearer <token>"
```

#### Actualitzar una tasca

```bash
curl -X PUT http://localhost:3000/api/tasks/675c...   -H "Content-Type: application/json"   -H "Authorization: Bearer <token>"   -d '{
    "completed": true
  }'
```

#### Obtenir estadístiques

```bash
curl -X GET http://localhost:3000/api/tasks/stats   -H "Authorization: Bearer <token>"
```

**Resposta:**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "completed": 7,
    "pending": 3,
    "totalCost": 2500,
    "totalHours": 45
  }
}
```

### 3. Gestió de Rols (Admin)

#### Crear un rol personalitzat

```bash
curl -X POST http://localhost:3000/api/admin/roles   -H "Content-Type: application/json"   -H "Authorization: Bearer <adminToken>"   -d '{
    "name": "supervisor",
    "description": "Supervisor amb permisos de lectura ampliats",
    "permissions": ["tasks:read", "users:read", "audit:read"]
  }'
```

#### Assignar un rol a un usuari

```bash
curl -X POST http://localhost:3000/api/admin/users/675c.../roles   -H "Content-Type: application/json"   -H "Authorization: Bearer <adminToken>"   -d '{
    "roleId": "supervisor"
  }'
```

#### Afegir permisos a un rol

```bash
curl -X POST http://localhost:3000/api/admin/roles/675r.../permissions   -H "Content-Type: application/json"   -H "Authorization: Bearer <adminToken>"   -d '{
    "permissions": ["tasks:create", "tasks:update"]
  }'
```

### 4. Consulta d'Auditoria (Admin)

#### Veure activitat recent

```bash
curl -X GET http://localhost:3000/api/admin/audit-logs/recent   -H "Authorization: Bearer <adminToken>"
```

#### Veure errors recents

```bash
curl -X GET http://localhost:3000/api/admin/audit-logs/errors   -H "Authorization: Bearer <adminToken>"
```

#### Historial d'un usuari

```bash
curl -X GET http://localhost:3000/api/admin/audit-logs/user/675u...   -H "Authorization: Bearer <adminToken>"
```

#### Estadístiques d'auditoria

```bash
curl -X GET http://localhost:3000/api/admin/audit-logs/stats   -H "Authorization: Bearer <adminToken>"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalActions": 1250,
    "successfulActions": 1180,
    "failedActions": 70,
    "successRate": 94.4,
    "actionsByType": [
      { "action": "tasks:create", "count": 350 },
      { "action": "tasks:update", "count": 280 },
      { "action": "users:read", "count": 450 }
    ]
  }
}
```

### 5. Verificar Permisos

#### Comprovar si tinc un permís

```bash
curl -X POST http://localhost:3000/api/auth/check-permission   -H "Content-Type: application/json"   -H "Authorization: Bearer <token>"   -d '{
    "permission": "users:manage"
  }'
```

**Resposta (si té permís):**
```json
{
  "success": true,
  "hasPermission": true,
  "message": "Tens permís per fer aquesta acció"
}
```

**Resposta (si no té permís):**
```json
{
  "success": false,
  "hasPermission": false,
  "message": "No tens permís per fer aquesta acció"
}
```

---

## Gestió d'Errors

### Errors Comuns

#### 1. Error d'Autenticació

**401 Unauthorized - No autoritzat, no hi ha token**

```json
{
  "success": false,
  "error": "No autoritzat, no hi ha token"
}
```

**Solució**: Afegir el header `Authorization: Bearer <token>`

---

**401 Unauthorized - Token invàlid**

```json
{
  "success": false,
  "error": "Token invàlid"
}
```

**Solució**: Fer login de nou per obtenir un token vàlid

---

**401 Unauthorized - Credencials invàlides**

```json
{
  "success": false,
  "error": "Credencials invàlides"
}
```

**Solucions**:
- Verificar que l'email i password són correctes
- Assegurar-se que l'usuari existeix (executar `node seed.js`)
- Comprovar que el password té mínim 6 caràcters

---

#### 2. Errors de Permisos

**403 Forbidden - No tens permís per fer aquesta acció**

```json
{
  "success": false,
  "error": "No tens permís per fer aquesta acció"
}
```

**Solució**:
- L'usuari no té el permís requerit
- Contactar amb un administrador per obtenir el rol adequat
- Verificar els permisos amb `GET /api/auth/my-permissions`

---

#### 3. Errors de Validació

**400 Bad Request - Validació**

```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Email inválido"
    },
    {
      "field": "password",
      "message": "Password mínimo 6 caracteres"
    }
  ]
}
```

**Solucions**:
- Email: Assegurar-se que té el format correcte (ex: `user@example.com`)
- Password: Mínim 6 caràcters
- Name: Mínim 2 caràcters si s'envia

---

**400 Bad Request - ID invàlido**

```json
{
  "success": false,
  "error": "ID invàlido"
}
```

**Causa**: MongoDB no pot convertir el string a ObjectId

**Solució**:
- Verificar que l'ID té el format correcte (24 caràcters hexadecimals)
- Usar noms de permisos en lloc d'IDs quan es creïn rols

---

#### 4. Errors de Recursos

**404 Not Found - Task no encontrada**

```json
{
  "success": false,
  "error": "Task no encontrada"
}
```

**Causes**:
- La tasca no existeix
- La tasca no pertany a l'usuari actual
- L'ID de la tasca és incorrecte

---

**404 Not Found - Usuari no trobat**

```json
{
  "success": false,
  "error": "Usuari no trobat"
}
```

**Solució**: Verificar que l'ID de l'usuari és correcte

---

#### 5. Errors de Conflicte

**400 Bad Request - Email ja registrat**

```json
{
  "success": false,
  "error": "Email ja registrat"
}
```

**Solució**: Usar un email diferent o fer login amb l'email existent

---

**400 Bad Request - Ja existeix un rol amb aquest nom**

```json
{
  "success": false,
  "error": "Ja existeix un rol amb aquest nom"
}
```

**Solució**: Usar un nom diferent per al rol

---

**400 Bad Request - No es pot eliminar un rol del sistema**

```json
{
  "success": false,
  "error": "No es pot eliminar un rol del sistema"
}
```

**Causa**: Intents eliminar un rol amb `isSystem: true` (admin, user, editor, viewer)

**Solució**: Només es poden eliminar rols personalitzats

---

#### 6. Errors del Servidor

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "Error del servidor"
}
```

**Solucions**:
- Verificar que MongoDB està en execució
- Comprovar les variables d'entorn al fitxer `.env`
- Revisar els logs del servidor per més detalls

---

**500 - Updating the path 'roles' would create a conflict**

```json
{
  "success": false,
  "error": "Updating the path 'roles' would create a conflict at 'roles'"
}
```

**Causa**: Intent de modificar el mateix camp dues vegades en una operació

**Solució**: Ja està corregit a la versió actual del codi

---

### Taula de Codis d'Error

| Codi | Significat | Causes Comunes |
|------|------------|----------------|
| 400 | Bad Request | Validació fallida, dades incorrectes |
| 401 | Unauthorized | Token absent, invàlid o expirat |
| 403 | Forbidden | Sense permisos per l'acció |
| 404 | Not Found | Recurs no trobat |
| 500 | Internal Server Error | Error del servidor, BD no disponible |

---

## Col·lecció de Postman

Pots importar la col·lecció completa de Postman amb tots els endpoints configurats.

### Variables de Col·lecció

```
baseUrl: http://localhost:3000
token: (s'emplena automàticament després del login)
adminToken: (s'emplena automàticament després del login d'admin)
```

### Ordre Recomanat per Provar

1. **1.3 Login Admin** - Obtenir token d'administrador
2. **4.x Admin - Rols** - Crear i gestionar rols
3. **5.x Admin - Permisos** - Gestionar permisos
4. **3.x Admin - Usuaris** - Gestionar usuaris
5. **1.1 Registre d'usuari** - Crear usuari normal
6. **1.2 Login** - Obtenir token d'usuari
7. **2.x Tasques** - Gestionar tasques
8. **6.x Admin - Auditoria** - Consultar registres

### Scripts de Test Automàtics

La col·lecció inclou scripts que guarden automàticament els tokens:

```javascript
// Login automàticament guarda el token
var jsonData = pm.response.json();
if (jsonData.token) {
    pm.collectionVariables.set('token', jsonData.token);
}
```

---

## Tecnologies

### Backend
- **Node.js** - Entorn d'execució
- **Express.js** - Framework web
- **MongoDB** - Base de dades NoSQL
- **Mongoose** - ODM per MongoDB

### Autenticació i Seguretat
- **jsonwebtoken** - Tokens JWT
- **bcryptjs** - Hash de contrasenyes
- **express-validator** - Validació de dades

### Utilitats
- **dotenv** - Variables d'entorn
- **cors** - CORS middleware

---

## Scripts Disponibles

```bash
# Iniciar el servidor en mode desenvolupament
npm start

# Executar el seed (crear permisos, rols i usuaris)
node seed.js
```

---

## Seguretat

### Bones Pràctiques Implementades

- Contrasenyes encriptades amb bcrypt
- Tokens JWT amb expiració
- Validació d'entrada amb express-validator
- Control d'accés basat en rols (RBAC)
- Auditoria completa d'accions
- Protecció contra modificació de rols del sistema
- Verificació de propietat de recursos (tasques)

### Recomanacions

- Canviar `JWT_SECRET` a un valor segur en producció
- Usar HTTPS en producció
- Implementar rate limiting
- Configurar CORS adequadament
- Fer backups regulars de la base de dades

---

## Autors

- **Desenvolupador Principal**: Junjie Wang
- **Versió**: T8 - Sistema Avançat de Rols i Permisos
- **Data**: Gener 2025
