import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import streamlit as st
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RECORDINGS_DIR, AUDIO_EXTENSIONS, MAX_AUDIO_SIZE_MB
from logger import get_logger

logger = get_logger(__name__)


class AudioRecorder:
    """Gestor de grabaciones de audio"""

    def __init__(self) -> None:
        RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info("AudioRecorder inicializado")

    def get_recordings_list(self) -> List[str]:
        """Obtiene lista de audios grabados localmente."""
        try:
            files = os.listdir(str(RECORDINGS_DIR))
            audio_files = [f for f in files if f.endswith(AUDIO_EXTENSIONS)]
            return sorted(audio_files, reverse=True)
        except OSError as e:
            logger.error(f"Error al leer directorio de grabaciones: {e}")
            return []

    def get_recordings_from_supabase(self) -> List[str]:
        """
        Obtiene lista de grabaciones desde PostgreSQL.
        Mantiene el nombre original para compatibilidad con index.py.
        """
        try:
            from database import init_db
            db = init_db()
            if not db:
                logger.warning("DB no disponible, usando lista local")
                return self.get_recordings_list()

            with db.cursor() as cur:
                cur.execute("SELECT filename FROM recordings ORDER BY created_at DESC")
                rows = cur.fetchall()
                return [row[0] for row in rows] if rows else []
        except Exception as e:
            logger.error(f"Error obteniendo grabaciones de BD: {e}")
            return self.get_recordings_list()

    def validate_audio_file(self, audio_data: bytes, filename: str) -> None:
        """Valida un archivo de audio antes de guardarlo."""
        size_mb = len(audio_data) / (1024 * 1024)
        if size_mb > MAX_AUDIO_SIZE_MB:
            raise ValueError(f"Archivo demasiado grande ({size_mb:.1f}MB). Máximo: {MAX_AUDIO_SIZE_MB}MB")
        ext = filename.lower().split('.')[-1]
        if ext not in AUDIO_EXTENSIONS:
            raise ValueError(f"Formato no soportado. Soportados: {', '.join(AUDIO_EXTENSIONS)}")
        if len(audio_data) == 0:
            raise ValueError("El archivo de audio está vacío")
        logger.info(f"Validación exitosa para: {filename} ({size_mb:.1f}MB)")

    def save_recording(self, audio_data: bytes, filename: Optional[str] = None) -> str:
        """Guarda un archivo de audio grabado."""
        try:
            if filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"recording_{timestamp}.wav"
            self.validate_audio_file(audio_data, filename)
            filepath = RECORDINGS_DIR / filename
            with open(filepath, "wb") as f:
                f.write(audio_data)
            logger.info(f"Audio guardado: {filename}")
            return str(filepath)
        except ValueError as e:
            logger.warning(f"Validación falló para {filename}: {e}")
            raise
        except IOError as e:
            logger.error(f"Error al guardar archivo: {e}")
            raise

    def delete_recording(self, filename: str) -> bool:
        """Elimina un archivo de audio."""
        try:
            filepath = RECORDINGS_DIR / filename
            if filepath.exists():
                filepath.unlink()
                logger.info(f"Audio eliminado: {filename}")
                return True
            logger.warning(f"Archivo no encontrado para eliminar: {filename}")
            return False
        except OSError as e:
            logger.error(f"Error al eliminar archivo {filename}: {e}")
            return False

    def get_recording_path(self, filename: str) -> str:
        """Obtiene la ruta completa de un archivo de audio."""
        filepath = RECORDINGS_DIR / filename
        if filepath.exists():
            return str(filepath)
        # Intentar descargar del volumen Docker
        try:
            from database import download_audio_from_storage
            logger.info(f"Archivo local no encontrado: {filename}. Buscando en storage...")
            if download_audio_from_storage(filename, str(filepath)):
                logger.info(f"Archivo recuperado: {filename}")
                return str(filepath)
        except Exception as e:
            logger.warning(f"Error recuperando audio: {e}")
        return str(filepath)
