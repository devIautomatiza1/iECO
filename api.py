"""api.py — FastAPI backend para iECO Next.js frontend
Arrancar con: uvicorn api:app --reload --port 8000
"""
from __future__ import annotations
import hashlib, json, os, re, uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import bcrypt
import google.generativeai as genai
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Body, Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from jose import JWTError, jwt

load_dotenv()

# ─── Config ───────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
JWT_SECRET: str = os.getenv("JWT_SECRET", "ieco-dev-secret-CHANGE-IN-PROD")
RECORDINGS_DIR = Path(os.getenv("RECORDINGS_DIR", "./data/recordings"))
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

MIME_TYPES = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "m4a": "audio/mp4",
    "flac": "audio/flac", "webm": "audio/webm", "ogg": "audio/ogg",
}
ALLOWED_EXTS = set(MIME_TYPES.keys())

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="iECO API", version="1.0.0")

_allowed_origins = list(filter(None, [
    "http://localhost:3000",
    "http://localhost:8000",
    FRONTEND_URL if FRONTEND_URL else None,
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https?://.*\.iautomatiza\.net",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Job store (en memoria) ─────────────────────────────────────────────────
_transcription_jobs: Dict[str, Dict[str, Any]] = {}
_executor = ThreadPoolExecutor(max_workers=4)


# ─── Global exception handler (garantiza CORS en errores 500) ───────────────
@app.exception_handler(Exception)
async def _unhandled_exc_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    import re as _re
    if origin and _re.match(r"https?://.*\.iautomatiza\.net", origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )


# ─── Health check ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "iECO API"}


# ─── DB ───────────────────────────────────────────────────────────────────────
def get_db() -> psycopg2.extensions.connection:
    if not DATABASE_URL:
        raise HTTPException(500, "DATABASE_URL no configurada")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn


@app.on_event("startup")
def startup():
    """Crea/migra tablas y columnas al arrancar."""
    if not DATABASE_URL:
        return
    try:
        conn = get_db()
        with conn.cursor() as cur:
            # ── Tabla companies (multi-tenant) ──────────────────────────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            # ── Tabla users ─────────────────────────────────────────────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT DEFAULT '',
                    company TEXT DEFAULT '',
                    role TEXT DEFAULT 'company_user',
                    active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER;")
            try:
                cur.execute("""
                    ALTER TABLE users ADD CONSTRAINT fk_users_company
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
                """)
            except Exception:
                pass
            # ── Tabla recordings ────────────────────────────────────────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS recordings (
                    id SERIAL PRIMARY KEY,
                    filename TEXT NOT NULL UNIQUE,
                    filepath TEXT NOT NULL,
                    transcription TEXT,
                    user_id INTEGER,
                    user_email TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("ALTER TABLE recordings ADD COLUMN IF NOT EXISTS company_id INTEGER;")
            try:
                cur.execute("""
                    ALTER TABLE recordings ADD CONSTRAINT fk_recordings_company
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
                """)
            except Exception:
                pass
            # ── Tabla opportunities ─────────────────────────────────────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS opportunities (
                    id SERIAL PRIMARY KEY,
                    recording_id INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    status TEXT DEFAULT 'open',
                    priority TEXT DEFAULT 'medium',
                    assignee TEXT DEFAULT '',
                    deadline TEXT DEFAULT '',
                    notes TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            for col, defn in [
                ("status",   "TEXT DEFAULT 'open'"),
                ("priority", "TEXT DEFAULT 'medium'"),
                ("assignee", "TEXT DEFAULT ''"),
                ("deadline", "TEXT DEFAULT ''"),
                ("notes",    "TEXT DEFAULT ''"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS {col} {defn};")
                except Exception:
                    pass
            # ── Migrar roles existentes ─────────────────────────────────────
            cur.execute("UPDATE users SET role='company_admin' WHERE role='admin'")
            cur.execute("UPDATE users SET role='company_user' WHERE role='user'")
            for email in SUPERADMIN_EMAILS:
                cur.execute("UPDATE users SET role='superadmin' WHERE email=%s", (email,))
            # ── Propagar company_id a recordings desde su propietario ───────
            cur.execute("""
                UPDATE recordings r
                SET company_id = u.company_id
                FROM users u
                WHERE r.user_id = u.id
                  AND r.company_id IS NULL
                  AND u.company_id IS NOT NULL;
            """)
        conn.close()
    except Exception as e:
        print(f"[startup] Error migrando BD: {e}")


# ─── Auth helpers ─────────────────────────────────────────────────────────────
def create_token(user_id: int, email: str) -> str:
    exp = datetime.utcnow() + timedelta(days=7)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": exp}, JWT_SECRET, algorithm="HS256")


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "No autorizado — incluye Bearer token")
    try:
        payload = jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(401, "Token inválido o expirado")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, email, name, role, company_id, active FROM users WHERE id=%s",
                (user_id,)
            )
            user = cur.fetchone()
    finally:
        db.close()
    if not user or not user["active"]:
        raise HTTPException(401, "Usuario no encontrado o inactivo")
    return dict(user)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
def login(body: Dict = Body(...)):
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    if not email or not password:
        raise HTTPException(400, "Email y contraseña requeridos")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE email=%s AND active=true", (email,))
            user = cur.fetchone()
    finally:
        db.close()
    if not user:
        raise HTTPException(400, "Credenciales incorrectas")
    try:
        ok = bcrypt.checkpw(password.encode(), user["password_hash"].encode())
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(400, "Credenciales incorrectas")
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"],
            "name": user["name"], "company": user["company"], "role": user["role"],
        },
    }


@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id,email,name,company,company_id,role FROM users WHERE id=%s", (user["id"],))
            row = cur.fetchone()
    finally:
        db.close()
    if not row:
        raise HTTPException(404, "Usuario no encontrado")
    return dict(row)


@app.post("/api/auth/register")
def register(body: Dict = Body(...)):
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    name = body.get("name", "").strip()
    company = body.get("company", "").strip()
    if not email or not password or not name:
        raise HTTPException(400, "Email, nombre y contraseña son requeridos")
    if len(password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres")
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                raise HTTPException(400, "El email ya está registrado")
            cur.execute(
                "INSERT INTO users (email, password_hash, name, company, role, active, created_at) VALUES (%s,%s,%s,%s,'company_user',TRUE,NOW()) RETURNING id",
                (email, pw_hash, name, company)
            )
            user_id = cur.fetchone()[0]
    finally:
        db.close()
    token = create_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email, "name": name, "company": company, "company_id": None, "role": "company_user"}}


# ─── Admin helpers ─────────────────────────────────────────────────────────────
SUPERADMIN_EMAILS = ["infra@iautomatiza.net", "dev@iautomatiza.net"]


def require_superadmin(user=Depends(get_current_user)):
    if user["role"] != "superadmin":
        raise HTTPException(403, "Acceso denegado — solo superadmins")
    return user


def require_company_admin(user=Depends(get_current_user)):
    if user["role"] not in ("superadmin", "company_admin"):
        raise HTTPException(403, "Acceso denegado — se requiere rol de administrador")
    return user


def _check_recording_access(user: Dict[str, Any], recording: Dict[str, Any]) -> None:
    """Valida que el usuario tenga acceso a la grabación según su rol."""
    role = user["role"]
    if role == "superadmin":
        return
    if role == "company_admin":
        if recording.get("company_id") != user.get("company_id"):
            raise HTTPException(403, "No tienes acceso a esta grabación")
        return
    # company_user: solo sus propias grabaciones
    if recording.get("user_id") != user["id"]:
        raise HTTPException(403, "No tienes acceso a esta grabación")


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — User management
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/users")
def admin_list_users(admin=Depends(require_company_admin)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if admin["role"] == "superadmin":
                cur.execute("""
                    SELECT u.id, u.email, u.name, u.role, u.company, u.company_id,
                           u.active, u.created_at, c.name AS company_name
                    FROM users u
                    LEFT JOIN companies c ON u.company_id = c.id
                    ORDER BY u.created_at DESC
                """)
            else:
                cur.execute("""
                    SELECT u.id, u.email, u.name, u.role, u.company, u.company_id,
                           u.active, u.created_at, c.name AS company_name
                    FROM users u
                    LEFT JOIN companies c ON u.company_id = c.id
                    WHERE u.company_id=%s
                    ORDER BY u.created_at DESC
                """, (admin["company_id"],))
            rows = cur.fetchall()
    finally:
        db.close()
    return [dict(r) for r in rows]


@app.post("/api/admin/users")
def admin_create_user(body: Dict = Body(...), admin=Depends(require_company_admin)):
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    name = body.get("name", "").strip()
    role = body.get("role", "company_user")
    company = body.get("company", "").strip()
    company_id = body.get("company_id")
    if not email or not password or not name:
        raise HTTPException(400, "Email, nombre y contraseña son requeridos")
    if admin["role"] == "superadmin":
        if role not in ("superadmin", "company_admin", "company_user"):
            raise HTTPException(400, "Rol inválido")
    else:
        # company_admin solo puede crear usuarios en su empresa
        if role not in ("company_admin", "company_user"):
            raise HTTPException(400, "Rol inválido")
        company_id = admin["company_id"]
    if company_id is not None:
        try:
            company_id = int(company_id)
        except (ValueError, TypeError):
            raise HTTPException(400, "company_id inválido")
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                raise HTTPException(400, "El email ya existe")
            cur.execute(
                "INSERT INTO users (email, password_hash, name, role, company, company_id, active, created_at) VALUES (%s,%s,%s,%s,%s,%s,TRUE,NOW()) RETURNING id",
                (email, pw_hash, name, role, company, company_id)
            )
            new_id = cur.fetchone()[0]
    finally:
        db.close()
    return {"id": new_id, "email": email, "name": name, "role": role, "company": company, "company_id": company_id, "active": True}


@app.patch("/api/admin/users/{user_id}/toggle")
def admin_toggle_user(user_id: int, body: Dict = Body(...), admin=Depends(require_company_admin)):
    active = body.get("active")
    if active is None:
        raise HTTPException(400, "Campo 'active' requerido")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT email, company_id, role FROM users WHERE id=%s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Usuario no encontrado")
            if admin["role"] != "superadmin" and row["company_id"] != admin["company_id"]:
                raise HTTPException(403, "No puedes modificar usuarios de otra empresa")
            if row["role"] == "superadmin":
                raise HTTPException(403, "No se puede modificar un superadmin")
            cur.execute("UPDATE users SET active=%s WHERE id=%s", (bool(active), user_id))
    finally:
        db.close()
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}")
def admin_update_user(user_id: int, body: Dict = Body(...), admin=Depends(require_company_admin)):
    allowed = {"name", "email", "role", "company_id"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "No hay campos válidos para actualizar")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT company_id, role FROM users WHERE id=%s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Usuario no encontrado")
            if row["role"] == "superadmin" and admin["role"] != "superadmin":
                raise HTTPException(403, "No se puede modificar un superadmin")
            if admin["role"] != "superadmin" and row["company_id"] != admin["company_id"]:
                raise HTTPException(403, "No puedes modificar usuarios de otra empresa")
            # company_admin no puede asignar superadmin
            if admin["role"] != "superadmin" and updates.get("role") == "superadmin":
                raise HTTPException(403, "No puedes asignar el rol superadmin")
            # Si cambia email, verificar unicidad
            if "email" in updates:
                cur.execute("SELECT id FROM users WHERE email=%s AND id!=%s", (updates["email"], user_id))
                if cur.fetchone():
                    raise HTTPException(409, "Ese email ya está en uso")
            set_clause = ", ".join(f"{k}=%s" for k in updates)
            cur.execute(f"UPDATE users SET {set_clause} WHERE id=%s", (*updates.values(), user_id))
            cur.execute(
                """SELECT u.id, u.email, u.name, u.role, u.company, u.company_id,
                          u.active, u.created_at, c.name as company_name
                   FROM users u LEFT JOIN companies c ON c.id=u.company_id
                   WHERE u.id=%s""",
                (user_id,)
            )
            updated = dict(cur.fetchone())
    finally:
        db.close()
    return updated


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, admin=Depends(require_company_admin)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT email, company_id, role FROM users WHERE id=%s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Usuario no encontrado")
            if row["role"] == "superadmin":
                raise HTTPException(403, "No se puede eliminar un superadmin")
            if admin["role"] != "superadmin" and row["company_id"] != admin["company_id"]:
                raise HTTPException(403, "No puedes eliminar usuarios de otra empresa")
            cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
    finally:
        db.close()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — Company management
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/companies")
def list_companies(admin=Depends(require_superadmin)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT c.id, c.name, c.slug, c.active, c.created_at,
                       COUNT(u.id) AS user_count
                FROM companies c
                LEFT JOIN users u ON u.company_id = c.id
                GROUP BY c.id
                ORDER BY c.created_at DESC
            """)
            rows = cur.fetchall()
    finally:
        db.close()
    return [dict(r) for r in rows]


@app.post("/api/companies")
def create_company(body: Dict = Body(...), admin=Depends(require_superadmin)):
    name = body.get("name", "").strip()
    slug = body.get("slug", "").strip().lower()
    if not name or not slug:
        raise HTTPException(400, "Nombre y slug son requeridos")
    import re as _re
    if not _re.match(r'^[a-z0-9-]+$', slug):
        raise HTTPException(400, "El slug solo puede contener letras minúsculas, números y guiones")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id FROM companies WHERE slug=%s", (slug,))
            if cur.fetchone():
                raise HTTPException(400, "El slug ya está en uso")
            cur.execute(
                "INSERT INTO companies (name, slug, active, created_at) VALUES (%s,%s,TRUE,NOW()) RETURNING *",
                (name, slug)
            )
            company = cur.fetchone()
    finally:
        db.close()
    return dict(company)


@app.patch("/api/companies/{company_id}")
def update_company(company_id: int, body: Dict = Body(...), admin=Depends(require_superadmin)):
    allowed = {"name", "slug", "active"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return {"ok": True}
    set_clause = ", ".join([f"{k}=%s" for k in updates])
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(f"UPDATE companies SET {set_clause} WHERE id=%s", [*updates.values(), company_id])
    finally:
        db.close()
    return {"ok": True}


@app.delete("/api/companies/{company_id}")
def delete_company(company_id: int, admin=Depends(require_superadmin)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE company_id=%s", (company_id,))
            count = cur.fetchone()[0]
            if count > 0:
                raise HTTPException(400, f"No puedes eliminar una empresa con {count} usuario(s) activos. Elimínalos primero.")
            cur.execute("DELETE FROM companies WHERE id=%s", (company_id,))
    finally:
        db.close()
    return {"ok": True}


@app.get("/api/companies/mine")
def get_my_company(user=Depends(get_current_user)):
    if not user.get("company_id"):
        raise HTTPException(404, "No tienes empresa asignada")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, slug, active, created_at FROM companies WHERE id=%s", (user["company_id"],))
            company = cur.fetchone()
    finally:
        db.close()
    if not company:
        raise HTTPException(404, "Empresa no encontrada")
    return dict(company)


# ═══════════════════════════════════════════════════════════════════════════════
# STATS (dashboard)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stats")
def get_stats(user=Depends(get_current_user)):
    db = get_db()
    role = user["role"]
    cid = user.get("company_id")
    uid = user["id"]
    try:
        with db.cursor() as cur:
            if role == "superadmin":
                cur.execute("SELECT COUNT(*) FROM recordings")
                total_recordings = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM recordings WHERE transcription IS NOT NULL AND transcription != ''")
                transcribed = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities WHERE status='open'")
                open_tickets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities WHERE status='closed'")
                closed_tickets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities WHERE priority='high' AND status='open'")
                high_priority = cur.fetchone()[0]
            elif role == "company_admin":
                cur.execute("SELECT COUNT(*) FROM recordings WHERE company_id=%s", (cid,))
                total_recordings = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM recordings WHERE company_id=%s AND transcription IS NOT NULL AND transcription != ''", (cid,))
                transcribed = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities o JOIN recordings r ON o.recording_id=r.id WHERE r.company_id=%s AND o.status='open'", (cid,))
                open_tickets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities o JOIN recordings r ON o.recording_id=r.id WHERE r.company_id=%s AND o.status='closed'", (cid,))
                closed_tickets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities o JOIN recordings r ON o.recording_id=r.id WHERE r.company_id=%s AND o.priority='high' AND o.status='open'", (cid,))
                high_priority = cur.fetchone()[0]
            else:  # company_user
                cur.execute("SELECT COUNT(*) FROM recordings WHERE user_id=%s", (uid,))
                total_recordings = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM recordings WHERE user_id=%s AND transcription IS NOT NULL AND transcription != ''", (uid,))
                transcribed = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities o JOIN recordings r ON o.recording_id=r.id WHERE r.user_id=%s AND o.status='open'", (uid,))
                open_tickets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities o JOIN recordings r ON o.recording_id=r.id WHERE r.user_id=%s AND o.status='closed'", (uid,))
                closed_tickets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities o JOIN recordings r ON o.recording_id=r.id WHERE r.user_id=%s AND o.priority='high' AND o.status='open'", (uid,))
                high_priority = cur.fetchone()[0]
    finally:
        db.close()
    return {
        "total_recordings": total_recordings,
        "transcribed": transcribed,
        "open_tickets": open_tickets,
        "closed_tickets": closed_tickets,
        "high_priority": high_priority,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RECORDINGS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/recordings")
def list_recordings(user=Depends(get_current_user)):
    db = get_db()
    role = user["role"]
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if role == "superadmin":
                cur.execute("""
                    SELECT id, filename,
                           transcription IS NOT NULL AND transcription != '' AS transcribed,
                           created_at, company_id, user_id
                    FROM recordings ORDER BY created_at DESC
                """)
            elif role == "company_admin":
                cur.execute("""
                    SELECT id, filename,
                           transcription IS NOT NULL AND transcription != '' AS transcribed,
                           created_at, company_id, user_id
                    FROM recordings WHERE company_id=%s ORDER BY created_at DESC
                """, (user["company_id"],))
            else:  # company_user
                cur.execute("""
                    SELECT id, filename,
                           transcription IS NOT NULL AND transcription != '' AS transcribed,
                           created_at, company_id, user_id
                    FROM recordings WHERE user_id=%s ORDER BY created_at DESC
                """, (user["id"],))
            rows = cur.fetchall()
    finally:
        db.close()
    return [dict(r) for r in rows]


@app.post("/api/recordings/upload")
async def upload_recording(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Formato no soportado. Usa: {', '.join(sorted(ALLOWED_EXTS))}")
    content = await file.read()
    if not content:
        raise HTTPException(400, "Archivo vacío")
    MAX_SIZE = 500 * 1024 * 1024  # 500 MB
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "El archivo supera el límite de 500 MB")
    md5 = hashlib.md5(content).hexdigest()[:8]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"recording_{ts}_{md5}.{ext}"
    filepath = RECORDINGS_DIR / filename
    filepath.write_bytes(content)
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "INSERT INTO recordings (filename, filepath, user_id, user_email, company_id, created_at) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                (filename, str(filepath), user["id"], user["email"], user.get("company_id"), datetime.now()),
            )
            recording_id = cur.fetchone()[0]
    finally:
        db.close()
    return {"id": recording_id, "filename": filename}


@app.get("/api/recordings/{recording_id}/audio")
def stream_audio(recording_id: int, user=Depends(get_current_user)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT filename, user_id, company_id FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
    finally:
        db.close()
    if not row:
        raise HTTPException(404, "Grabación no encontrada")
    _check_recording_access(user, row)
    path = RECORDINGS_DIR / row["filename"]
    if not path.exists():
        raise HTTPException(404, "Archivo de audio no encontrado en el servidor")
    ext = row["filename"].rsplit(".", 1)[-1].lower()
    return FileResponse(str(path), media_type=MIME_TYPES.get(ext, "audio/mpeg"), filename=row["filename"])


@app.delete("/api/recordings/{recording_id}")
def delete_recording(recording_id: int, user=Depends(get_current_user)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT filename, user_id, company_id FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
            if row:
                _check_recording_access(user, row)
                f = RECORDINGS_DIR / row["filename"]
                if f.exists():
                    f.unlink()
                cur.execute("DELETE FROM opportunities WHERE recording_id=%s", (recording_id,))
                cur.execute("DELETE FROM recordings WHERE id=%s", (recording_id,))
    finally:
        db.close()
    return {"ok": True}


@app.patch("/api/recordings/{recording_id}/rename")
def rename_recording(recording_id: int, body: Dict = Body(...), user=Depends(get_current_user)):
    new_name = body.get("filename", "").strip()
    if not new_name:
        raise HTTPException(400, "Nombre requerido")
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT filename, user_id, company_id FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Grabación no encontrada")
            _check_recording_access(user, row)
            src = RECORDINGS_DIR / row["filename"]
            dst = RECORDINGS_DIR / new_name
            if src.exists():
                src.rename(dst)
            cur.execute("UPDATE recordings SET filename=%s, updated_at=NOW() WHERE id=%s", (new_name, recording_id))
    finally:
        db.close()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSCRIPTION
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/recordings/{recording_id}/transcription")
def get_transcription(recording_id: int, user=Depends(get_current_user)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT transcription, user_id, company_id FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
    finally:
        db.close()
    if not row:
        raise HTTPException(404, "Grabación no encontrada")
    _check_recording_access(user, row)
    if not row["transcription"]:
        raise HTTPException(404, "Sin transcripción disponible")
    return {"transcription": row["transcription"]}


def _run_transcription_job(recording_id: int, job_id: str, audio_path_str: str, mime: str) -> None:
    """Se ejecuta en un hilo separado para no bloquear el proxy."""
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        audio_file = genai.upload_file(audio_path_str, mime_type=mime)
        prompt = """Transcribe esta conversación/reunión identificando CADA HABLANTE por separado.

FORMATO EXACTO (una línea por intervención, sin líneas vacías entre ellas):
NombreHablante: Texto exacto que dijo

REGLAS:
- Usa los nombres reales si se mencionan en la conversación
- Si no hay nombre, usa Voz1, Voz2, Voz3...
- Mantén consistencia: el mismo hablante siempre tiene el mismo nombre
- Transcribe textualmente sin parafrasear
- NO incluyas explicaciones, solo el diálogo"""
        response = model.generate_content([prompt, audio_file])
        transcription = response.text
        db = get_db()
        try:
            with db.cursor() as cur:
                cur.execute(
                    "UPDATE recordings SET transcription=%s, updated_at=NOW() WHERE id=%s",
                    (transcription, recording_id),
                )
        finally:
            db.close()
        _transcription_jobs[job_id] = {"status": "completed", "transcription": transcription}
    except Exception as exc:
        _transcription_jobs[job_id] = {"status": "error", "error": str(exc)}


@app.post("/api/recordings/{recording_id}/transcribe")
def transcribe(recording_id: int, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY no configurada")
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT filename FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
    finally:
        db.close()
    if not row:
        raise HTTPException(404, "Grabación no encontrada")
    audio_path = RECORDINGS_DIR / row[0]
    if not audio_path.exists():
        raise HTTPException(404, "Archivo de audio no encontrado en el servidor")
    ext = row[0].rsplit(".", 1)[-1].lower()
    mime = MIME_TYPES.get(ext, "audio/mpeg")
    job_id = str(uuid.uuid4())
    _transcription_jobs[job_id] = {"status": "processing"}
    background_tasks.add_task(_run_transcription_job, recording_id, job_id, str(audio_path), mime)
    return {"job_id": job_id, "status": "processing"}


@app.get("/api/transcription-jobs/{job_id}")
def get_transcription_job(job_id: str, user=Depends(get_current_user)):
    job = _transcription_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job no encontrado o expirado")
    return job


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/recordings/{recording_id}/summary")
async def generate_summary(recording_id: int, user=Depends(get_current_user)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY no configurada")
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT transcription FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
    finally:
        db.close()
    if not row or not row[0]:
        raise HTTPException(400, "Primero transcribe el audio")
    transcription = row[0]
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""Genera un resumen ejecutivo profesional de esta transcripción de reunión.

TRANSCRIPCIÓN:
{transcription}

El resumen debe incluir:
1. **Contexto y participantes**: De qué trata la reunión y quiénes participan
2. **Puntos clave tratados**: Los temas más importantes discutidos
3. **Decisiones tomadas**: Acuerdos o decisiones concretas alcanzadas
4. **Próximos pasos**: Acciones pendientes y responsables si se mencionan
5. **Conclusión**: Síntesis de los resultados de la reunión

Redacta en español, con tono profesional y en formato claro. Usa negrita para los encabezados de cada sección."""
    try:
        response = model.generate_content(prompt)
        return {"summary": response.text}
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
            raise HTTPException(429, "Cuota de Gemini AI agotada. Espera unos minutos y vuelve a intentarlo.")
        raise HTTPException(500, f"Error al generar resumen: {err_str}")


# ═══════════════════════════════════════════════════════════════════════════════
# KEYWORDS DICTIONARY
# ═══════════════════════════════════════════════════════════════════════════════

KEYWORDS_FILE = Path(__file__).parent / "keywords_dict.json"


@app.get("/api/keywords")
def get_keywords(user=Depends(get_current_user)):
    try:
        with open(KEYWORDS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(404, "Archivo de keywords no encontrado")
    except json.JSONDecodeError:
        raise HTTPException(500, "Error al leer el archivo de keywords")


@app.put("/api/keywords")
def update_keywords(body: Dict = Body(...), user=Depends(get_current_user)):
    if user["email"] not in SUPERADMIN_EMAILS:
        raise HTTPException(403, "Solo superadmins pueden editar el diccionario")
    if "temas_de_interes" not in body:
        raise HTTPException(400, "El body debe contener 'temas_de_interes'")
    # Validate structure
    temas = body["temas_de_interes"]
    if not isinstance(temas, dict):
        raise HTTPException(400, "temas_de_interes debe ser un objeto")
    for nombre, categoria in temas.items():
        if not isinstance(categoria, dict):
            raise HTTPException(400, f"Categoría '{nombre}' debe ser un objeto")
        if "prioridad" not in categoria or "variantes" not in categoria:
            raise HTTPException(400, f"Categoría '{nombre}' debe tener 'prioridad' y 'variantes'")
        if categoria["prioridad"] not in ("high", "medium", "low"):
            raise HTTPException(400, f"Prioridad de '{nombre}' debe ser high, medium o low")
        if not isinstance(categoria["variantes"], list):
            raise HTTPException(400, f"'variantes' de '{nombre}' debe ser una lista")
    try:
        with open(KEYWORDS_FILE, "w", encoding="utf-8") as f:
            json.dump(body, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(500, f"Error al guardar: {str(e)}")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# OPPORTUNITIES / TICKETS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/recordings/{recording_id}/opportunities")
def get_opportunities(recording_id: int, user=Depends(get_current_user)):
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM opportunities WHERE recording_id=%s ORDER BY created_at DESC",
                (recording_id,),
            )
            rows = cur.fetchall()
    finally:
        db.close()
    return [dict(r) for r in rows]


@app.post("/api/recordings/{recording_id}/analyze")
async def analyze_opportunities(recording_id: int, user=Depends(get_current_user)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY no configurada")
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT transcription FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
    finally:
        db.close()
    if not row or not row[0]:
        raise HTTPException(400, "Primero transcribe el audio")
    transcription = row[0]
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""Analiza esta transcripción de reunión de negocios y extrae TODAS las tareas, oportunidades y acciones pendientes.

TRANSCRIPCIÓN:
{transcription}

Responde ÚNICAMENTE con un JSON array (sin markdown, sin explicaciones):
[
  {{
    "title": "Título corto y accionable (máx 60 caracteres)",
    "description": "Descripción completa con contexto de la conversación",
    "priority": "high|medium|low",
    "assignee": "Nombre del responsable si se menciona, si no cadena vacía",
    "deadline": "Fecha límite si se menciona, si no cadena vacía"
  }}
]"""
    try:
        response = model.generate_content(prompt)
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
            raise HTTPException(429, "Cuota de Gemini AI agotada. Espera unos minutos y vuelve a intentarlo.")
        raise HTTPException(500, f"Error al analizar con IA: {err_str}")
    raw = response.text.strip()
    # Extraer el array JSON incluso si hay texto extra
    json_match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not json_match:
        raise HTTPException(500, "La IA no devolvió JSON válido")
    try:
        tickets_data: List[Dict] = json.loads(json_match.group())
    except json.JSONDecodeError:
        raise HTTPException(500, "Error al parsear respuesta de IA")
    saved: List[Dict] = []
    db = get_db()
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for t in tickets_data:
                cur.execute(
                    """INSERT INTO opportunities
                       (recording_id, title, description, status, priority, assignee, deadline, created_at)
                       VALUES (%s,%s,%s,'open',%s,%s,%s,NOW()) RETURNING *""",
                    (
                        recording_id,
                        t.get("title", "")[:200],
                        t.get("description", ""),
                        t.get("priority", "medium"),
                        t.get("assignee", ""),
                        t.get("deadline", ""),
                    ),
                )
                saved.append(dict(cur.fetchone()))
    finally:
        db.close()
    return {"tickets": saved, "count": len(saved)}


@app.patch("/api/opportunities/{opportunity_id}")
def update_opportunity(opportunity_id: int, body: Dict = Body(...), user=Depends(get_current_user)):
    allowed = {"title", "description", "status", "notes", "priority", "assignee", "deadline"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return {"ok": True}
    set_clause = ", ".join([f"{k}=%s" for k in updates])
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                f"UPDATE opportunities SET {set_clause} WHERE id=%s",
                [*updates.values(), opportunity_id],
            )
    finally:
        db.close()
    return {"ok": True}


@app.delete("/api/opportunities/{opportunity_id}")
def delete_opportunity(opportunity_id: int, user=Depends(get_current_user)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("DELETE FROM opportunities WHERE id=%s", (opportunity_id,))
    finally:
        db.close()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# CHAT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/chat")
async def chat(body: Dict = Body(...), user=Depends(get_current_user)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY no configurada")
    question: str = body.get("question", "").strip()
    recording_id: Optional[int] = body.get("recording_id")
    history: List[Dict] = body.get("history", [])
    if not question:
        raise HTTPException(400, "Pregunta requerida")
    transcription = ""
    recording_name = ""
    if recording_id:
        db = get_db()
        try:
            with db.cursor() as cur:
                cur.execute("SELECT filename, transcription FROM recordings WHERE id=%s", (recording_id,))
                row = cur.fetchone()
        finally:
            db.close()
        if row:
            recording_name = row[0]
            transcription = row[1] or ""
    hist_text = ""
    if history:
        recent = history[-8:]
        hist_text = "\n".join(
            [f"{'Usuario' if h['role']=='user' else 'Asistente'}: {h['content']}" for h in recent]
        )
    prompt_parts = ["Eres un asistente inteligente de análisis de reuniones de negocios para iECO."]
    if recording_name:
        prompt_parts.append(f"Archivo analizado: {recording_name}")
    if transcription:
        prompt_parts.append(f"\nTRANSCRIPCIÓN DE LA REUNIÓN:\n{transcription}")
    else:
        prompt_parts.append("\nNo hay transcripción disponible para este audio todavía.")
    if hist_text:
        prompt_parts.append(f"\nHISTORIAL DE CONVERSACIÓN:\n{hist_text}")
    prompt_parts.append(
        "\nResponde de forma precisa, útil y concisa en español. "
        "Si la información solicitada no está en la transcripción, indícalo claramente.\n"
        f"\nPregunta del usuario: {question}"
    )
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content("\n".join(prompt_parts))
        return {"response": response.text}
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
            raise HTTPException(429, "Cuota de Gemini AI agotada. Espera unos minutos y vuelve a intentarlo.")
        raise HTTPException(500, f"Error al generar respuesta: {err_str}")
