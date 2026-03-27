"""database.py - Acceso a BD PostgreSQL con retry y manejo de errores"""
import os
import shutil
import streamlit as st
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
import sys
import time

sys.path.insert(0, str(Path(__file__).parent.parent))
from logger import get_logger
from helpers import validate_file

logger = get_logger(__name__)

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None
    logger.warning("⚠️  psycopg2 no instalado")

# ============================================================================
# CONFIGURACIÓN
# ============================================================================
MAX_RETRIES = 3
RETRY_DELAY = 1  # segundos
RECORDINGS_DIR = Path(os.getenv("RECORDINGS_DIR", "/data/recordings"))

# ============================================================================
# UTILIDADES
# ============================================================================

def retry_operation(
    func: Callable,
    *args,
    retries: int = MAX_RETRIES,
    delay: float = RETRY_DELAY,
    **kwargs
) -> Any:
    """Reintenta una operación BD con backoff exponencial"""
    last_exception = None
    for attempt in range(retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < retries - 1:
                wait_time = delay * (2 ** attempt)
                logger.warning(f"Intento {attempt + 1}/{retries} falló. Reintentando en {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"Operación falló después de {retries} intentos: {type(e).__name__}")
    return None

# ============================================================================
# CONEXIÓN A POSTGRESQL
# ============================================================================

@st.cache_resource
def init_db():
    """Inicializa conexión a PostgreSQL con manejo de errores"""
    try:
        database_url = os.getenv("DATABASE_URL", "").strip()
        if not database_url:
            logger.error("❌ DATABASE_URL no configurada")
            return None
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        logger.info("✓ Conexión PostgreSQL OK")
        _ensure_tables(conn)
        _ensure_recordings_dir()
        return conn
    except Exception as e:
        logger.error(f"❌ Init PostgreSQL: {e}")
        return None

def _ensure_recordings_dir():
    """Crea el directorio de grabaciones si no existe"""
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"✓ Directorio de grabaciones: {RECORDINGS_DIR}")

def _ensure_tables(conn):
    """Crea las tablas si no existen"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS recordings (
                    id SERIAL PRIMARY KEY,
                    filename TEXT NOT NULL UNIQUE,
                    filepath TEXT NOT NULL,
                    transcription TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS transcriptions (
                    id SERIAL PRIMARY KEY,
                    recording_id INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    language TEXT DEFAULT 'es',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS opportunities (
                    id SERIAL PRIMARY KEY,
                    recording_id INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
        logger.info("✓ Tablas verificadas")
    except Exception as e:
        logger.error(f"❌ Error creando tablas: {e}")

# ============================================================================
# STORAGE LOCAL — reemplaza Supabase Storage
# ============================================================================

def upload_audio_to_storage(filename: str, filepath: str) -> bool:
    """Copia audio al directorio de grabaciones del VPS"""
    valid, err = validate_file(filepath)
    if not valid:
        logger.error(f"❌ {err}")
        return False
    try:
        dest = RECORDINGS_DIR / filename
        shutil.copy2(filepath, dest)
        logger.info(f"✓ {filename} guardado en {dest}")
        return True
    except Exception as e:
        logger.error(f"❌ Storage upload: {type(e).__name__} - {e}")
        return False

def download_audio_from_storage(filename: str, save_to: str) -> bool:
    """Copia audio desde el directorio de grabaciones"""
    try:
        src = RECORDINGS_DIR / filename
        if not src.exists():
            logger.warning(f"Archivo no encontrado: {src}")
            return False
        shutil.copy2(src, save_to)
        return True
    except Exception as e:
        logger.warning(f"Download: {str(e)}")
        return False

def delete_audio_from_storage(filename: str) -> bool:
    """Elimina audio del directorio de grabaciones"""
    try:
        target = RECORDINGS_DIR / filename
        if target.exists():
            target.unlink()
        return True
    except Exception as e:
        logger.warning(f"Delete storage: {e}")
        return False

# ============================================================================
# OPERACIONES DE BASE DE DATOS
# ============================================================================

def save_recording_to_db(filename: str, filepath: str, transcription: Optional[str] = None) -> Optional[int]:
    """Copia audio al storage + guarda metadata en BD"""
    db = init_db()
    if not db:
        return None

    logger.info(f"[1/2] Storage: {filename}")
    if not upload_audio_to_storage(filename, filepath):
        logger.error("[FAIL] Storage")
        return None

    logger.info(f"[2/2] BD metadata")
    try:
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO recordings (filename, filepath, transcription, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (filename, filepath, transcription, datetime.now()))
            recording_id = cur.fetchone()[0]
            logger.info(f"✓ Recording ID: {recording_id}")
            return recording_id
    except Exception as e:
        logger.error(f"❌ BD insert: {e}")
        return None

def get_all_recordings() -> List[Dict]:
    """Obtiene todas las grabaciones"""
    db = init_db()
    if not db:
        return []
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM recordings ORDER BY created_at DESC")
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"❌ get_all_recordings: {e}")
        return []

def update_transcription(recording_id: int, transcription: str) -> bool:
    """Actualiza transcripción de una grabación"""
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("""
                UPDATE recordings SET transcription=%s, updated_at=%s WHERE id=%s
            """, (transcription, datetime.now(), recording_id))
        return True
    except Exception as e:
        logger.error(f"❌ update_transcription: {e}")
        return False

def update_recording_filename(old_filename: str, new_filename: str) -> bool:
    """Renombra archivo en storage y actualiza BD"""
    db = init_db()
    if not db:
        return False
    try:
        src = RECORDINGS_DIR / old_filename
        dest = RECORDINGS_DIR / new_filename
        if not src.exists():
            logger.error(f"❌ Archivo no encontrado: {src}")
            return False

        logger.info(f"[1/2] Renombrando archivo...")
        src.rename(dest)

        logger.info(f"[2/2] Actualizando BD...")
        with db.cursor() as cur:
            cur.execute("""
                UPDATE recordings SET filename=%s, updated_at=%s WHERE filename=%s
            """, (new_filename, datetime.now(), old_filename))

        logger.info(f"✓ {old_filename} → {new_filename}")
        return True
    except Exception as e:
        logger.error(f"❌ update_recording_filename: {e}")
        if dest.exists() and not src.exists():
            dest.rename(src)
        return False

def save_opportunity(recording_id: int, title: str, description: str) -> bool:
    """Guarda una oportunidad de negocio"""
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO opportunities (recording_id, title, description, created_at)
                VALUES (%s, %s, %s, %s)
            """, (recording_id, title, description, datetime.now()))
        return True
    except Exception as e:
        logger.error(f"❌ save_opportunity: {e}")
        return False

def get_opportunities_by_recording(recording_id: int) -> List[Dict]:
    """Obtiene oportunidades de una grabación"""
    db = init_db()
    if not db:
        return []
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM opportunities WHERE recording_id=%s", (recording_id,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"❌ get_opportunities_by_recording: {e}")
        return []

def delete_recording_from_db(recording_id: int) -> bool:
    """Elimina grabación, sus oportunidades y el archivo de audio"""
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("SELECT filename FROM recordings WHERE id=%s", (recording_id,))
            row = cur.fetchone()
            filename = row[0] if row else None

            cur.execute("DELETE FROM opportunities WHERE recording_id=%s", (recording_id,))
            cur.execute("DELETE FROM recordings WHERE id=%s", (recording_id,))

        if filename:
            delete_audio_from_storage(filename)
        return True
    except Exception as e:
        logger.error(f"❌ delete_recording_from_db: {e}")
        return False

def delete_recording_by_filename(filename: str) -> bool:
    """Busca y elimina por filename"""
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM recordings WHERE filename=%s", (filename,))
            row = cur.fetchone()
            if row:
                return delete_recording_from_db(row[0])
        return True
    except Exception as e:
        logger.error(f"❌ delete_recording_by_filename: {e}")
        return False

def save_transcription(recording_filename: str, content: str, language: str = "es") -> Optional[int]:
    """Guarda transcripción en tabla transcriptions"""
    db = init_db()
    if not db:
        return None
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM recordings WHERE filename=%s", (recording_filename,))
            row = cur.fetchone()
            if not row:
                return None
            recording_id = row[0]
            cur.execute("""
                INSERT INTO transcriptions (recording_id, content, language, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (recording_id, content, language, datetime.now(), datetime.now()))
            return cur.fetchone()[0]
    except Exception as e:
        logger.error(f"❌ save_transcription: {e}")
        return None

def get_transcription_by_filename(recording_filename: str) -> Optional[Dict]:
    """Obtiene la transcripción más reciente por filename"""
    db = init_db()
    if not db:
        return None
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id FROM recordings WHERE filename=%s", (recording_filename,))
            row = cur.fetchone()
            if not row:
                return None
            cur.execute("""
                SELECT * FROM transcriptions WHERE recording_id=%s
                ORDER BY created_at DESC LIMIT 1
            """, (row["id"],))
            result = cur.fetchone()
            return dict(result) if result else None
    except Exception as e:
        logger.error(f"❌ get_transcription_by_filename: {e}")
        return None

def delete_transcription_by_id(transcription_id: int) -> bool:
    """Elimina una transcripción por ID"""
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("DELETE FROM transcriptions WHERE id=%s", (transcription_id,))
        return True
    except Exception as e:
        logger.error(f"❌ delete_transcription_by_id: {e}")
        return False
