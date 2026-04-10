"""utils.py - Utilidades frontales para procesamiento de audio"""
import hashlib
import streamlit as st
from pathlib import Path
from typing import Tuple, Optional, Any
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import MAX_AUDIO_SIZE_MB
from logger import get_logger
from notifications import show_success, show_error

logger = get_logger(__name__)


def process_audio_file(
    audio_bytes: bytes,
    filename: str,
    recorder: Any,
    db_utils: Any
) -> Tuple[bool, Optional[int]]:
    """Procesa un archivo de audio — valida, guarda en disco y BD."""
    try:
        size_mb = len(audio_bytes) / (1024 * 1024)
        if size_mb > MAX_AUDIO_SIZE_MB:
            show_error(f"Archivo > {MAX_AUDIO_SIZE_MB}MB ({size_mb:.1f}MB)")
            return False, None

        if not audio_bytes:
            show_error("Audio vacío")
            return False, None

        audio_hash = hashlib.md5(audio_bytes).hexdigest()
        if audio_hash in st.session_state.processed_audios:
            logger.info(f"Audio ya procesado: {audio_hash}")
            return False, None

        filepath = recorder.save_recording(audio_bytes, filename)

        # Obtener user_id de la sesión activa
        user = st.session_state.get("user")
        user_id = user["id"] if user else None
        user_email = user["email"] if user else None

        recording_id = db_utils.save_recording_to_db(
            filename, filepath,
            user_id=user_id,
            user_email=user_email
        )

        if not recording_id:
            show_error("Error al guardar en la base de datos")
            logger.error(f"BD falló: {filename}")
            return False, None

        st.session_state.processed_audios.add(audio_hash)
        st.session_state.recordings = recorder.get_recordings_from_supabase()

        logger.info(f"✓ Audio OK: {filename} (ID: {recording_id})")

        if "debug_log" not in st.session_state:
            st.session_state.debug_log = []
        from datetime import datetime
        st.session_state.debug_log.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "type": "success",
            "message": f"Audio '{filename}' guardado (ID: {recording_id})"
        })
        return True, recording_id

    except (ValueError, FileNotFoundError) as e:
        show_error(f"Error: {str(e)}")
        logger.warning(f"Validación falló: {filename} - {e}")
        return False, None

    except Exception as e:
        show_error(f"Error procesando: {str(e)}")
        logger.error(f"Error: {filename} - {e}")
        return False, None


def delete_audio(filename: str, recorder: Any, db_utils: Any) -> bool:
    """Elimina un archivo de audio de BD y almacenamiento local."""
    try:
        db_utils.delete_recording_by_filename(filename)
        recorder.delete_recording(filename)
        st.session_state.processed_audios.clear()
        if filename in st.session_state.recordings:
            st.session_state.recordings.remove(filename)
        logger.info(f"✓ Eliminado: {filename}")
        return True
    except Exception as e:
        show_error(f"Error al eliminar: {str(e)}")
        logger.error(f"Delete error: {filename} - {e}")
        return False
