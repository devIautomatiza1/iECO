# iECO — Sistema de Transcripción y Análisis de Reuniones con IA

<div align="center">

**Plataforma completa para grabar, transcribir e inteligentemente analizar reuniones con IA**

![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-yellow?logo=google)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

</div>

---

## Descripción General

**iECO** es un sistema integral de gestión de reuniones que combina un backend FastAPI de alto rendimiento con un frontend moderno en Next.js. Permite:

- Subir y gestionar grabaciones de audio
- Transcribir automáticamente con **diarización inteligente** (identifica quién habla)
- Consultar un **Asistente IA** sobre el contenido de las reuniones
- Generar **resúmenes ejecutivos** automáticos
- Gestionar **tickets y oportunidades de negocio** extraídas con IA
- **Panel de administración** para gestionar usuarios

---

## Arquitectura del Proyecto

El frontend original en **Streamlit** fue reemplazado completamente por un frontend moderno en **Next.js 15 con React 19**. La aplicación ahora tiene una arquitectura desacoplada cliente-servidor:

```
iECO/
├── api.py                        # Backend FastAPI (punto de entrada)
├── auth.py                       # Lógica de autenticación JWT
├── config.py                     # Configuración global
├── Dockerfile                    # Docker para el backend
├── requirements.txt
├── keywords_dict.json            # Diccionario de temas IA configurables
├── backend/
│   ├── database.py               # Operaciones CRUD PostgreSQL
│   ├── helpers.py                # Utilidades compartidas
│   ├── Model.py                  # Integración con Gemini AI
│   ├── OpportunitiesManager.py   # Gestión de tickets
│   ├── sharing.py                # Compartir por email/WhatsApp
│   └── Transcriber.py            # Transcripción con Gemini
├── frontend/                     # (legado) Frontend Streamlit — ya no en uso
└── frontend-next/                # ✅ Frontend activo — Next.js 15
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx           # Página principal (dashboard)
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   ├── DashboardModule.tsx
    │   │   ├── AudioModule.tsx
    │   │   ├── TranscriptionModule.tsx
    │   │   ├── ChatModule.tsx
    │   │   ├── TicketsModule.tsx
    │   │   ├── SettingsModule.tsx
    │   │   ├── AdminModule.tsx
    │   │   └── ThemeProvider.tsx
    │   └── lib/
    │       ├── api.ts             # Cliente centralizado de la API
    │       ├── auth-context.tsx   # Contexto de autenticación React
    │       └── utils.ts
```

---

## Stack Tecnológico

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.11 | Lenguaje principal |
| FastAPI | 0.11x | Framework API REST |
| Uvicorn | Latest | Servidor ASGI |
| psycopg2 | Latest | Driver PostgreSQL |
| python-jose | Latest | JWT (autenticación) |
| bcrypt | Latest | Hash de contraseñas |
| google-generativeai | Latest | Gemini AI (transcripción, chat, análisis) |
| python-dotenv | Latest | Variables de entorno |

### Frontend (Next.js)
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15 | Framework React con SSR/SSG |
| React | 19 | UI components |
| TypeScript | Latest | Tipado estático |
| Tailwind CSS | v4 | Estilos utilitarios |
| shadcn/ui | Latest | Componentes UI |
| Lucide React | Latest | Iconografía |

### Infraestructura
| Tecnología | Uso |
|---|---|
| PostgreSQL | Base de datos principal |
| Docker | Contenedorización de ambos servicios |
| Coolify | Deploy en producción (self-hosted) |
| Traefik | Proxy inverso y SSL en Coolify |

---

## Características

### Grabaciones de Audio
- Subida de archivos en formatos: MP3, WAV, M4A, FLAC, WebM, OGG
- Reproducción directa desde el navegador con player integrado
- Renombrado inline de grabaciones
- Eliminación con confirmación

### Transcripción Inteligente
- Transcripción automática con **Google Gemini 2.0 Flash**
- **Diarización avanzada**: identifica automáticamente cada hablante
- **Identificación por nombre**: si alguien dice "Hola María", la IA reconoce que esa voz es María
- Proceso **asíncrono con polling**: no hay timeout por audios largos, el job corre en background y el frontend consulta el estado cada 5s hasta completar (máx 10 min)

### Resumen Ejecutivo con IA
- Generación de resúmenes profesionales con Gemini
- Incluye: contexto y participantes, puntos clave, decisiones, próximos pasos, conclusión

### Asistente IA (Chat)
- Chatbot inteligente basado en Gemini para analizar el contenido de las reuniones
- Historial de conversación con contexto de los últimos 8 mensajes
- Selección de grabación a analizar desde el propio chat

### Tickets y Oportunidades
- Análisis semántico automático de transcripciones para extraer oportunidades de negocio
- 8 temas preconfigurables con prioridad automática (Alta/Media/Baja)
- Diccionario de temas personalizable vía `keywords_dict.json`
- Edición, cambio de estado y eliminación de tickets
- Estados: `open`, `in_progress`, `closed`

### Dashboard
- Estadísticas en tiempo real: total de grabaciones, transcripciones, tickets abiertos/cerrados
- Acceso rápido a las últimas grabaciones

### Panel de Administración
- Gestión de usuarios (solo admins)
- Activar/desactivar cuentas
- Cambio de roles

---

## Variables de Entorno

### Backend
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
JWT_SECRET=cadena_aleatoria_larga_y_segura
FRONTEND_URL=https://ieco.iautomatiza.net
RECORDINGS_DIR=./data/recordings
```

### Frontend (Next.js)
```env
NEXT_PUBLIC_API_URL=https://api.ieco.iautomatiza.net
```

> **Importante:** `NEXT_PUBLIC_API_URL` debe estar disponible en **build time** (activar "Available at Buildtime" en Coolify).

---

## Instalación Local

### Requisitos
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Docker (opcional)

### Backend

```bash
# 1. Crear entorno virtual
python -m venv .venv
.\.venv\Scripts\activate   # Windows
source .venv/bin/activate  # macOS/Linux

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear .env con las variables de entorno

# 4. Las tablas se crean automáticamente al arrancar

# 5. Arrancar el backend
uvicorn api:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend-next

# 1. Instalar dependencias
npm install

# 2. Crear .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 3. Arrancar en desarrollo
npm run dev
# → http://localhost:3000

# 4. Build para producción
npm run build
npm start
```

---

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Login → devuelve JWT |
| GET | `/api/auth/me` | Datos del usuario autenticado |

### Grabaciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/recordings` | Listar grabaciones |
| POST | `/api/recordings/upload` | Subir archivo de audio |
| GET | `/api/recordings/{id}/audio` | Descargar audio |
| PATCH | `/api/recordings/{id}/rename` | Renombrar grabación |
| DELETE | `/api/recordings/{id}` | Eliminar grabación |
| GET | `/api/recordings/{id}/transcription` | Obtener transcripción (404 si no existe) |
| POST | `/api/recordings/{id}/transcribe` | Iniciar transcripción async → `{ job_id }` |
| POST | `/api/recordings/{id}/summary` | Generar resumen ejecutivo |
| POST | `/api/recordings/{id}/analyze` | Analizar y generar tickets con IA |

### Jobs de Transcripción
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/transcription-jobs/{job_id}` | Consultar estado del job |

### Tickets
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/recordings/{id}/opportunities` | Listar tickets de una grabación |
| PATCH | `/api/opportunities/{id}` | Editar ticket |
| DELETE | `/api/opportunities/{id}` | Eliminar ticket |

### Chat y Estadísticas
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/chat` | Enviar mensaje al asistente IA |
| GET | `/api/stats` | Estadísticas del dashboard |
| GET | `/` | Health check |

### Admin
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/users` | Listar todos los usuarios |
| PATCH | `/api/admin/users/{id}` | Actualizar rol/estado de usuario |
| DELETE | `/api/admin/users/{id}` | Eliminar usuario |

---

## Deploy en Coolify

### Backend
- **Build Pack:** Dockerfile (raíz del repo `/`)
- **Puerto:** 8000
- **Variables de entorno obligatorias:** `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `FRONTEND_URL`
- **Dominio:** `api.ieco.iautomatiza.net`

### Frontend (Next.js)
- **Build Pack:** Dockerfile
- **Dockerfile path:** `frontend-next/Dockerfile`
- **Puerto:** 3000
- **Variables:** `NEXT_PUBLIC_API_URL=https://api.ieco.iautomatiza.net` con **"Available at Buildtime"** activado
- **Dominio:** `ieco.iautomatiza.net`

> No configurar Port Mappings, Custom Docker Options, Watch Paths ni Pre-deployment en ninguno de los dos servicios.

---

## Flujo de Transcripción Asíncrona

Para evitar timeouts del proxy Traefik (corta conexiones a los 60s por defecto), la transcripción usa un modelo asíncrono:

```
1. POST /api/recordings/{id}/transcribe
   → Devuelve inmediatamente: { job_id, status: "processing" }
   → Gemini corre en background (ThreadPoolExecutor)

2. Frontend hace polling cada 5s:
   GET /api/transcription-jobs/{job_id}
   → { status: "processing" }              (sigue esperando)
   → { status: "completed", transcription } (listo)
   → { status: "error", error: "..." }     (falló)

3. Timeout máximo: 120 intentos × 5s = 10 minutos
```

---

## Seguridad

- Autenticación con **JWT** (python-jose) con expiración configurable
- Contraseñas hasheadas con **bcrypt**
- CORS configurado para `*.iautomatiza.net` + `localhost:3000`
- Handler global de excepciones que garantiza headers CORS incluso en errores 500
- Todos los endpoints de datos requieren token válido
- Separación de roles: `user`, `admin`, `superadmin`

---

## Errores Conocidos y Soluciones

| Error | Causa | Solución aplicada |
|---|---|---|
| `Module not found: @/lib/api` en build Docker | `.gitignore` raíz ignoraba `frontend-next/src/lib/` | Añadida excepción `!frontend-next/src/lib/` al `.gitignore` |
| `POST /api/chat` bloqueado por CORS | FastAPI no añade CORS headers en errores 500 sin capturar | Handler global `@app.exception_handler(Exception)` + try/catch en todos los endpoints de Gemini |
| Timeout en transcripción de audio largo | Traefik corta conexiones a los 60s | Transcripción asíncrona con BackgroundTasks + polling desde frontend |
| `NaN:NaN` en player de audio | `duration` del `<audio>` es `NaN` antes de cargar metadata | Guard en `fmtTime()`: retorna `"--:--"` para valores inválidos |
| Error 429 de Gemini sin mensaje útil | Excepción cruda de Google sin capturar | Captura de errores 429/quota con mensaje amigable en español en todos los endpoints |

---

## Migración desde Streamlit

El frontend original (`frontend/`) fue construido con **Streamlit** (Python). Fue reemplazado completamente por `frontend-next/` (Next.js 15 + React 19 + TypeScript + Tailwind CSS v4) por:

- **Rendimiento**: build standalone optimizado, sin recarga completa de página
- **UX moderna**: estado local React, transiciones suaves, tema oscuro/claro dinámico
- **Escalabilidad**: arquitectura desacoplada, backend es API REST pura
- **Type safety**: TypeScript en todo el cliente
- **Deploy eficiente**: Docker multi-stage build, imagen mínima

El directorio `frontend/` se mantiene en el repo como referencia histórica pero no se despliega.

---

## Licencia

Proyecto privado — iAutomatiza.net
