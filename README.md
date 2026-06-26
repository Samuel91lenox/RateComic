# 🎬 RateComic

Plataforma web para puntuar y comentar películas y series. Los usuarios se registran, buscan contenido mediante la API oficial de TMDB y lo valoran con estrellas del **1 al 10**, además de poder dejar comentarios y responder a otros usuarios.

> Diseñado para escalar a libros y cómics en el futuro.

---

## Stack tecnológico

| Capa       | Tecnología                                     |
|------------|------------------------------------------------|
| Frontend   | Angular 19 + Angular Material (tema oscuro)    |
| Backend    | Node.js + Express 4                            |
| Base de datos | SQLite (vía `better-sqlite3`)               |
| Autenticación | JWT (jsonwebtoken + bcryptjs)              |
| API externa | TMDB API                                     |

---

## Estructura del proyecto

```
RateComic/
├── backend/                 # API REST con Express
│   ├── src/
│   │   ├── app.js           # Configuración de Express
│   │   ├── index.js         # Punto de entrada
│   │   ├── database/
│   │   │   ├── db.js        # Instancia de SQLite
│   │   │   └── init.js      # Migraciones DDL
│   │   ├── models/          # Acceso a datos
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Servicios externos (TMDB)
│   │   └── middleware/      # Auth JWT, validación
│   └── .env                 # Variables de entorno
│
└── frontend/                # Aplicación Angular
    └── src/app/
        ├── core/
        │   ├── models/      # Interfaces TypeScript
        │   ├── services/    # HTTP services
        │   ├── guards/      # Auth y Guest guards
        │   └── interceptors/# JWT interceptor
        ├── features/
        │   ├── auth/        # Login y Registro
        │   ├── home/        # Página principal
        │   ├── media/       # Búsqueda y detalle
        │   └── profile/     # Perfil de usuario
        └── shared/
            └── components/  # StarRating, CommentCard, MediaCard, Navbar
```

---

## Puesta en marcha

### 1. Obtener credenciales de TMDB

1. Ve a [https://developer.themoviedb.org/docs/authentication-application](https://developer.themoviedb.org/docs/authentication-application)
2. Genera un `API Read Access Token` o usa tu `API Key`
3. Configura el backend con una de las dos opciones

### 2. Configurar el backend

```bash
cd backend
# Copia el fichero de ejemplo
copy .env.example .env
# Edita .env y reemplaza el token o la API key de TMDB
```

### 3. Instalar dependencias

```bash
# Desde la raíz del proyecto
npm run install:all
```

O de forma individual:

```bash
cd backend  && npm install
cd frontend && npm install
```

### 4. Arrancar el backend

```bash
cd backend
npm run dev
# API disponible en http://localhost:3000
```

### 5. Arrancar el frontend

```bash
cd frontend
npm start
# App disponible en http://localhost:4200
```

---

## Configuración y administración

### Variables de entorno del backend

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto de la API Express | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `JWT_SECRET` | Secreto para firmar JWT | configurado en `.env` |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `TMDB_ACCESS_TOKEN` | Token Bearer de lectura de TMDB | requerido si no usas API key |
| `TMDB_API_KEY` | API key v3 de TMDB | requerida si no usas token |
| `MEDIA_CACHE_HOURS` | TTL de caché de detalle de media | `24` |
| `SEARCH_CACHE_HOURS` | TTL de caché de búsquedas | `24` |
| `DB_PATH` | Ruta del fichero SQLite | `./data/ratecomic.db` |
| `CORS_ORIGIN` | Origen permitido para el frontend | `http://localhost:4200` |

### Comandos útiles

#### Desde la raíz

```bash
npm run install:all      # Instala backend y frontend
npm run start:backend    # Arranca el backend en modo desarrollo
npm run start:frontend   # Arranca el frontend Angular
npm run db:init          # Inicializa / actualiza el esquema SQLite
npm run db:backup        # Crea una copia de seguridad de SQLite
npm run db:restore       # Lista backups disponibles o restaura uno
npm run cache:clean      # Limpia caché expirada manualmente
npm run cache:stats      # Muestra estadísticas de la caché
```

#### Desde backend

```bash
npm run dev              # Backend con nodemon
npm start                # Backend sin hot reload
npm run db:init          # Inicializa la base de datos
npm run db:backup        # Crea un backup en data/backups/
npm run db:restore       # Lista backups disponibles
npm run db:restore <archivo>            # Restaura el backup indicado
npm run cache:clean      # Elimina solo caché expirada
npm run cache:stats      # Muestra métricas de caché en JSON
node src/scripts/cache-clean.js --all   # Vacía toda la caché de media y búsquedas
```

### Backups y restauración de base de datos

- `npm run db:backup` crea una copia del fichero SQLite en `backend/data/backups/`.
- El nombre del fichero incluye timestamp con formato `ratecomic-YYYYMMDD-HHMMSS.db`.
- Es útil antes de limpiezas agresivas, cambios de esquema o pruebas manuales.
- `npm run db:restore` (sin argumentos) lista todos los backups disponibles con tamaño y fecha.
- `npm run db:restore <archivo>` restaura ese backup sobre la DB activa:
  - Crea automáticamente un backup de seguridad (`ratecomic-before-restore-TIMESTAMP.db`) antes de sobreescribir.
  - **El servidor debe estar detenido** antes de restaurar para evitar corrupción.
  - Tras restaurar, reinicia el servidor para usar la DB restaurada.

### Comportamiento de la caché

- Los detalles de películas y series se guardan en SQLite y se reutilizan hasta que caduquen.
- Las búsquedas por término, tipo y página también se guardan en SQLite.
- Al arrancar la API se purga automáticamente la caché expirada.
- Si quieres forzar una limpieza manual sin reiniciar, usa `npm run cache:clean`.
- Si quieres vaciar toda la caché almacenada, usa `node src/scripts/cache-clean.js --all` desde `backend`.
- Si quieres inspeccionar cuántas entradas hay y su antigüedad, usa `npm run cache:stats`.

---

## API REST — Endpoints

### Autenticación

| Método | Ruta              | Descripción                  | Auth |
|--------|-------------------|------------------------------|------|
| POST   | /api/auth/register | Registro de usuario         | No   |
| POST   | /api/auth/login    | Login, devuelve JWT         | No   |
| GET    | /api/auth/me       | Datos del usuario actual    | Sí   |

### Media (películas / series)

| Método | Ruta                    | Descripción                           | Auth |
|--------|-------------------------|---------------------------------------|------|
| GET    | /api/media/search       | Buscar en TMDB (`?q=&type=&page=`)    | No   |
| GET    | /api/media/trending     | Más valorados localmente              | No   |
| GET    | /api/media/:imdbId      | Detalle completo (con caché)          | No   |

### Valoraciones

| Método | Ruta                    | Descripción                           | Auth |
|--------|-------------------------|---------------------------------------|------|
| POST   | /api/ratings            | Crear / actualizar puntuación         | Sí   |
| GET    | /api/ratings/me         | Mis valoraciones                      | Sí   |
| GET    | /api/ratings/:imdbId    | Estadísticas de un media              | No   |
| DELETE | /api/ratings/:imdbId    | Eliminar mi puntuación                | Sí   |

### Comentarios

| Método | Ruta                    | Descripción                           | Auth |
|--------|-------------------------|---------------------------------------|------|
| POST   | /api/comments           | Publicar comentario o respuesta       | Sí   |
| GET    | /api/comments/:imdbId   | Comentarios de un media               | No   |
| PATCH  | /api/comments/:id       | Editar comentario propio              | Sí   |
| DELETE | /api/comments/:id       | Eliminar comentario propio            | Sí   |

---

## Esquema de base de datos (SQLite)

```sql
users        -- id, username, email, password_hash, avatar_url, bio
media        -- id, imdb_id (UNIQUE), title, type, year, plot, poster_url, ...
ratings      -- id, user_id, media_id, score (1-10)  UNIQUE(user_id, media_id)
comments     -- id, user_id, media_id, parent_id (nullable), content
```

La tabla `media` actúa como **caché local** de TMDB. Los datos se almacenan la primera vez que se consultan y se refrescan tras `MEDIA_CACHE_HOURS` horas (por defecto 24 h).

Las búsquedas por término, tipo y página también se cachean en SQLite durante `SEARCH_CACHE_HOURS` horas. Al arrancar la API se purga automáticamente la caché expirada tanto de media como de búsquedas.

Internamente, para no romper ratings, comentarios y rutas ya creadas, la aplicación usa una clave pública de media con formato `tmdb-movie-123` o `tmdb-series-456` almacenada en el campo `imdb_id` existente de la base de datos.

---

## Funcionalidades implementadas

- [x] Registro e inicio de sesión con JWT
- [x] Búsqueda de películas y series vía TMDB API
- [x] Caché de resultados en SQLite
- [x] Puntuación de 1 a 10 estrellas por usuario
- [x] Estadísticas de puntuación de la comunidad
- [x] Comentarios en películas/series
- [x] Respuestas anidadas a comentarios
- [x] Edición y eliminación de comentarios propios
- [x] Perfil de usuario con historial de valoraciones
- [x] Tema oscuro con Angular Material
- [x] Rate limiting y cabeceras de seguridad (Helmet)
- [x] Arquitectura preparada para añadir libros / cómics

---

## Próximos pasos sugeridos

- [ ] Añadir soporte para libros (`type = 'book'`) con Google Books API
- [ ] Paginación infinita en la búsqueda
- [ ] Sistema de notificaciones cuando alguien responde tu comentario
- [ ] Listas personalizadas (watchlist, vistos, favoritos)
- [ ] Tests unitarios e integración
- [ ] Docker Compose para despliegue
