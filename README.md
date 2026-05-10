# Task Manager API — T9: JWT Avançat + Jerarquia de Rols

API REST per gestionar tasques amb autenticació JWT dual (Access + Refresh Token), jerarquia de rols amb herència de permisos, delegació temporal de permisos i rate limiting basat en rols.

## Taula de Continguts

- [Característiques](#característiques)
- [Sistema de Permisos](#sistema-de-permisos)
- [Jerarquia de Rols](#jerarquia-de-rols)
- [Delegació de Permisos](#delegació-de-permisos)
- [Estructura del Projecte](#estructura-del-projecte)
- [Instal·lació i Setup](#installació-i-setup)
- [Endpoints de l'API](#endpoints-de-lapi)
- [Seguretat](#seguretat)
- [Col·lecció Postman](#collecció-postman)
- [Tecnologies](#tecnologies)
- [Autors](#autors)

---

## Característiques

### Autenticació JWT Dual
- **Access Token** (15 min): per autoritzar peticions
- **Refresh Token** (7 dies): per renovar l'access token sense fer login
- **Token Blacklist**: logout real amb invalidació de tokens a MongoDB (TTL automàtic)
- **Reset de contrasenya**: flux complet amb token de reset (TTL 1 hora)

### Jerarquia de Rols
- Rols amb `level` i `parentRole` per definir l'arbre de jerarquia
- Herència recursiva de permisos (un rol fill hereta tots els permisos del pare)
- Detecció de cicles: validació que `parentRole.level < nouRol.level`
- Endpoints per consultar la cadena jeràrquica i tots els permisos heretats

### Delegació de Permisos
- Delegació temporal d'un permís específic entre usuaris (`fromUserId` → `toUserId`)
- Durada configurable en dies (`daysValid`)
- Estats: `active`, `expired`, `revoked`
- Permisos delegats actius s'afegeixen automàticament al token en cada petició

### Rate Limiting per Rols
- Límits diferenciats per rol: VIEWER (50), USER (100), MANAGER (200), ADMIN (500), SUPER_ADMIN (1000) req/min
- Retorna `429 Too Many Requests` en superar el límit
- Clau per `userId` quan l'usuari és autenticat, per IP quan és anònim

### Seguretat
- Headers de seguretat amb `helmet`
- CORS configurat
- Validació d'entrada amb `express-validator`
- Auditoria completa de totes les accions

---

## Sistema de Permisos

Els permisos segueixen la nomenclatura `recurs:acció`:

| Permís | Descripció |
|--------|------------|
| `tasks:create` | Crear noves tasques |
| `tasks:read` | Veure tasques |
| `tasks:update` | Editar tasques |
| `tasks:delete` | Eliminar tasques |
| `users:read` | Veure llista d'usuaris |
| `users:manage` | Crear, editar i eliminar usuaris |
| `roles:read` | Veure rols |
| `roles:manage` | Crear, editar i eliminar rols |
| `permissions:read` | Veure permisos |
| `permissions:manage` | Crear, editar i eliminar permisos |
| `audit:read` | Veure registres d'auditoria |

### Rols per Defecte

| Rol | Level | Permisos |
|-----|-------|----------|
| `admin` | 1 | Tots els permisos |
| `editor` | 2 | `tasks:*`, `users:read` |
| `user` | 3 | `tasks:*` |
| `viewer` | 4 | `tasks:read` |

---

## Jerarquia de Rols

```
admin (level 1)
  └── manager (level 2)
        └── user (level 3)
              └── viewer (level 4)
```

Un rol fill hereta **tots** els permisos del pare. La validació impedeix crear cicles: el `parentRole` ha de tenir un `level` estrictament superior al del nou rol.

### Endpoints de Jerarquia

```http
GET /api/roles/:id/hierarchy        # Cadena jeràrquica fins a l'arrel
GET /api/roles/:id/all-permissions  # Tots els permisos (propis + heretats)
```

---

## Delegació de Permisos

Un usuari pot delegar temporalment un permís a un altre:

```json
POST /api/delegations
{
  "toUserId": "...",
  "permission": "audit:read",
  "reason": "Cobertura durant vacances",
  "daysValid": 7
}
```

El middleware `auth` carrega automàticament les delegacions actives i les afegeix als permisos efectius de l'usuari en cada petició.

---

## Estructura del Projecte

```
task-manager-api/
│
├── .env.example                  # Variables d'entorn (plantilla)
├── .env                          # Variables d'entorn (NO pujar al repo)
├── .gitignore
├── package.json
├── app.js                        # Arrencada i configuració Express
│
├── models/
│   ├── User.js
│   ├── Task.js
│   ├── Role.js                   # + level, parentRole
│   ├── Permission.js
│   ├── AuditLog.js
│   ├── TokenBlacklist.js         # NOU T9 - TTL index per neteja automàtica
│   ├── PasswordReset.js          # NOU T9 - Reset de contrasenya
│   └── DelegatedPermission.js    # NOU T9 - Delegació de permisos
│
├── services/
│   └── jwtService.js             # NOU T9 - Access + Refresh tokens
│
├── controllers/
│   ├── authController.js         # + refresh, logout, forgot/reset password
│   ├── taskController.js
│   ├── adminController.js
│   ├── roleController.js         # + hierarchy, all-permissions
│   ├── permissionController.js
│   ├── auditController.js
│   └── delegationController.js   # NOU T9 - CRUD delegacions
│
├── middleware/
│   ├── auth.js                   # + blacklist check, delegated permissions
│   ├── checkPermission.js
│   ├── rateLimiter.js            # NOU T9 - Rate limiting per rols
│   ├── auditLog.js
│   └── errorHandler.js
│
├── routes/
│   ├── authRoutes.js             # + /refresh, /logout, /forgot-password, /reset-password
│   ├── taskRoutes.js
│   ├── userRoutes.js             # NOU T9
│   ├── roleRoutes.js             # NOU T9
│   ├── permissionRoutes.js       # NOU T9
│   ├── delegationRoutes.js       # NOU T9
│   ├── auditRoutes.js            # NOU T9
│   └── adminRoutes.js            # Legacy - mantingut per compatibilitat
│
└── utils/
    ├── errorResponse.js
    ├── seedData.js
    └── generateToken.js
```

---

## Instal·lació i Setup

### 1. Prerequisits

- Node.js 18+
- MongoDB 5.0+ (local o Atlas)
- npm

### 2. Clonar el Repositori

```bash
git clone https://github.com/JunjieeWang/task-manager-api2.git
cd task-manager-api2
```

### 3. Instal·lar Dependències

```bash
npm install
```

### 4. Configurar Variables d'Entorn

```bash
cp .env.example .env
```

Edita `.env` amb els teus valors:

```env
MONGO_JJ=mongodb://localhost:27017/task-manager-t9
JWT_SECRET=el_teu_secret_super_segur_min_32_chars
JWT_REFRESH_SECRET=un_altre_secret_per_refresh_tokens
PORT=3000
AUTO_SEED=true
```

### 5. Iniciar el Servidor

```bash
# Desenvolupament (amb nodemon)
npm run dev

# Producció
npm start
```

El seed s'executa automàticament si `AUTO_SEED=true` i crea:
- 11 permisos del sistema
- 4 rols per defecte (admin, editor, user, viewer)
- 3 usuaris de prova

### Credencials de Prova

| Usuari | Email | Password | Rol |
|--------|-------|----------|-----|
| Admin | admin@example.com | admin123 | admin |
| Editor | editor@example.com | editor123 | editor |
| User | user@example.com | user123 | user |

---

## Endpoints de l'API

### Autenticació — `/api/auth`

| Mètode | Ruta | Descripció |
|--------|------|------------|
| POST | `/register` | Registrar nou usuari |
| POST | `/login` | Iniciar sessió → access + refresh token |
| GET | `/me` | Perfil de l'usuari autenticat |
| POST | `/refresh` | Renovar access token amb refresh token |
| POST | `/logout` | Invalidar access + refresh token |
| POST | `/forgot-password` | Sol·licitar reset de contrasenya |
| POST | `/reset-password/:token` | Establir nova contrasenya |

### Usuaris — `/api/users` *(requereix autenticació)*

| Mètode | Ruta | Permís requerit |
|--------|------|-----------------|
| GET | `/` | `users:read` |
| GET | `/:id` | `users:read` |
| POST | `/` | `users:manage` |
| PUT | `/:id` | `users:manage` |
| DELETE | `/:id` | `users:manage` |
| PUT | `/:id/roles` | `users:manage` |
| GET | `/:id/permissions` | `users:read` |

### Rols — `/api/roles` *(requereix autenticació)*

| Mètode | Ruta | Permís requerit |
|--------|------|-----------------|
| GET | `/` | `roles:read` |
| GET | `/:id` | `roles:read` |
| POST | `/` | `roles:manage` |
| PUT | `/:id` | `roles:manage` |
| DELETE | `/:id` | `roles:manage` |
| PUT | `/:id/permissions` | `roles:manage` |
| GET | `/:id/hierarchy` | `roles:read` |
| GET | `/:id/all-permissions` | `roles:read` |

### Permisos — `/api/permissions` *(requereix autenticació)*

| Mètode | Ruta | Permís requerit |
|--------|------|-----------------|
| GET | `/` | `permissions:read` |
| GET | `/:id` | `permissions:read` |
| POST | `/` | `permissions:manage` |
| PUT | `/:id` | `permissions:manage` |
| DELETE | `/:id` | `permissions:manage` |

### Delegacions — `/api/delegations` *(requereix autenticació)*

| Mètode | Ruta | Descripció |
|--------|------|------------|
| GET | `/` | Llistar totes les delegacions |
| GET | `/user/:userId` | Delegacions d'un usuari |
| GET | `/:id` | Obtenir delegació per ID |
| POST | `/` | Crear delegació |
| PUT | `/:id` | Actualitzar delegació |
| DELETE | `/:id` | Revocar delegació |

### Auditoria — `/api/audit` *(requereix `audit:read`)*

| Mètode | Ruta | Descripció |
|--------|------|------------|
| GET | `/logs` | Logs amb filtres i paginació |
| GET | `/stats` | Estadístiques agregades |
| GET | `/stats/user/:userId` | Logs d'un usuari específic |
| GET | `/export?format=csv` | Exportar fins a 5000 logs en CSV |

### Tasques — `/api/tasks` *(requereix autenticació)*

| Mètode | Ruta | Permís requerit |
|--------|------|-----------------|
| GET | `/` | `tasks:read` |
| POST | `/` | `tasks:create` |
| GET | `/:id` | `tasks:read` |
| PUT | `/:id` | `tasks:update` |
| DELETE | `/:id` | `tasks:delete` |

---

## Seguretat

- Contrasenyes encriptades amb **bcrypt**
- Tokens JWT amb expiració i blacklist
- Headers de seguretat amb **helmet**
- Rate limiting per rols amb **express-rate-limit**
- Validació d'entrada amb **express-validator**
- Auditoria completa de totes les accions

> **Producció**: Canvia `JWT_SECRET` i `JWT_REFRESH_SECRET` per valors aleatoris llargs. Usa HTTPS. Configura CORS adequadament.

---

## Col·lecció Postman

Importa `T9-postman-collection.json` a Postman. Conté les 51 proves organitzades en 9 carpetes.

**Variables de col·lecció configurades automàticament:**
`baseUrl`, `accessToken`, `refreshToken`, `userId`, `roleId`, `permId`, `delegId`, `taskId`, `resetToken`

---

## Tecnologies

| Tecnologia | Versió | Ús |
|------------|--------|-----|
| Node.js | 18+ | Entorn d'execució |
| Express | 4.x | Framework web |
| MongoDB + Mongoose | 8.x | Base de dades |
| jsonwebtoken | 9.x | Tokens JWT |
| bcrypt | 5.x | Hash de contrasenyes |
| express-rate-limit | 8.x | Rate limiting |
| helmet | 8.x | Headers de seguretat |
| express-validator | 7.x | Validació d'entrada |
| dotenv | 16.x | Variables d'entorn |

---

## Scripts Disponibles

```bash
npm run dev    # Servidor en mode desenvolupament (nodemon)
npm start      # Servidor en mode producció
npm run seed   # Executar seed manualment
```

---

## Autors

- **Junjie Wang**
- Versió: **T9 — JWT Avançat + Jerarquia de Rols**
- Curs: 2n DAW — Frameworks — LACETÀNIA 2024-2025
