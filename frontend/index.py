import streamlit as st
import sys
import re
from pathlib import Path

# Agregar carpetas al path para importar módulos
app_root = Path(__file__).parent.parent
sys.path.insert(0, str(app_root / "backend"))
sys.path.insert(0, str(app_root / "frontend"))

# Importar configuración y logger
from config import APP_NAME, AUDIO_EXTENSIONS
from logger import get_logger

logger = get_logger(__name__)

# Importar de frontend (misma carpeta)
from AudioRecorder import AudioRecorder
import styles
import components
from components import render_colorful_transcription
from notifications import (
    show_success, show_error, show_warning, show_info,
    show_success_expanded, show_error_expanded, show_info_expanded, show_warning_expanded,
    show_success_debug, show_error_debug, show_info_debug
)
from utils import process_audio_file, delete_audio
from performance import get_transcription_cached, is_audio_transcribed, update_opportunity_local, delete_opportunity_local, delete_keyword_local, delete_recording_local, init_optimization_state
from helpers import format_recording_name

# Importar de backend
from Transcriber import Transcriber
from Model import Model
from OpportunitiesManager import OpportunitiesManager
import database as db_utils

from datetime import datetime
from config import CHAT_HISTORY_LIMIT

# ============================================================================
# FUNCIONES DE INICIALIZACIÓN
# ============================================================================

def initialize_session_state(recorder_obj: AudioRecorder) -> None:
    """Inicializa todos los valores del session_state de forma centralizada"""
    session_defaults = {
        "processed_audios": set(),
        "recordings": recorder_obj.get_recordings_from_supabase(),
        "recordings_map": {},  # Mapeo: filename → recording_id para análisis de oportunidades
        "selected_audio": None,
        "upload_key_counter": 0,
        "record_key_counter": 0,
        "keywords": {},
        "delete_confirmation": {},
        "transcription_cache": {},
        "chat_history_limit": CHAT_HISTORY_LIMIT,
        "opp_delete_confirmation": {},
        "debug_log": [],  # Registro de eventos para el DEBUG
        "audio_page": 0,  # Página actual para paginación de audios
        "tickets_page": 0, # Página actual para paginación de tickets
        "editing_audio": None,  # Archivo siendo editado
        "new_audio_name": "",  # Nuevo nombre del archivo
        "generating_summary": False,  # Flag para generar resumen
        "summary_text": None,  # Texto del resumen generado
        "show_email_modal": False,  # Modal para enviar resumen por email
        "show_whatsapp_modal": False,  # Modal para enviar resumen por WhatsApp
        "show_email_transcript": False,  # Modal para enviar transcripción por email
        "show_whatsapp_transcript": False,  # Modal para enviar transcripción por WhatsApp
    }
    
    for key, value in session_defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

# Función auxiliar para agregar eventos al debug log
def add_debug_event(message: str, event_type: str = "info") -> None:
    """Agrega un evento al registro de debug"""
    if "debug_log" not in st.session_state:
        st.session_state.debug_log = []
    
    timestamp = datetime.now().strftime("%H:%M:%S")
    st.session_state.debug_log.append({
        "time": timestamp,
        "type": event_type,
        "message": message
    })

def update_recordings_map() -> None:
    """Actualiza el mapeo de filename → recording_id desde PostgreSQL"""
    try:
        from database import init_db
        db = init_db()
        if not db:
            logger.warning("DB no disponible para actualizar recordings_map")
            st.session_state.recordings_map = {}
            return
 
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, filename FROM recordings ORDER BY created_at DESC LIMIT 50"
            )
            rows = cur.fetchall()
 
        if rows:
            recordings_map = {filename: rec_id for rec_id, filename in rows}
            st.session_state.recordings_map = recordings_map
            logger.info(f"✅ Recordings map actualizado: {len(recordings_map)} registros")
        else:
            st.session_state.recordings_map = {}
    except Exception as e:
        logger.error(f"❌ Error actualizando recordings_map: {type(e).__name__} - {str(e)[:100]}")

# ============================================================================
# CONFIGURACIÓN INICIAL DE LA INTERFAZ DE USUARIO
# ============================================================================

st.set_page_config(layout="wide", page_title=APP_NAME)
# Barra superior con usuario y logout
from auth import logout, is_admin
from admin import render_admin_panel, is_superadmin

user = st.session_state.get("user", {})
col_user, col_logout = st.columns([8, 1])
with col_user:
    st.markdown(f'<p style="color:#94a3b8; font-size:13px; margin:0;">👤 {user.get("name", "")} · {user.get("company", "")}</p>', unsafe_allow_html=True)
with col_logout:
    if st.button("Salir", key="logout_btn"):
        logout()
        st.rerun()
# Cargar estilos CSS desde archivo
st.markdown(styles.get_styles(), unsafe_allow_html=True)

# Renderizar efectos de fondo animados
components.render_background_effects()

# Inicializar objetos
recorder = AudioRecorder()
transcriber_model = Transcriber()
chat_model = Model()
opp_manager = OpportunitiesManager()

# Inicializar estado de sesión de forma centralizada
initialize_session_state(recorder)

# Inicializar optimizaciones de performance
init_optimization_state()

# Crear dos columnas principales (4/8 split como en el diseño)
col_left, col_right = st.columns([4, 8])

# ============================================================================
# PANEL IZQUIERDO - Grabadora y Subir Audio
# ============================================================================
with col_left:
    # ===== GRABADORA EN VIVO =====
    st.subheader("Grabadora en vivo")
    st.caption("Graba directamente desde tu micrófono")
    
    audio_data = st.audio_input("", key=f"audio_recorder_{st.session_state.record_key_counter}", label_visibility="collapsed")
    
    # Procesar audio grabado SOLO UNA VEZ por hash
    if audio_data is not None:
        audio_bytes = audio_data.getvalue()
        if len(audio_bytes) > 0:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"recording_{timestamp}.wav"
            
            success, recording_id = process_audio_file(audio_bytes, filename, recorder, db_utils)
            
            if success:
                # Reset el widget para que no se procese nuevamente
                st.session_state.record_key_counter += 1
    
    # ===== SUBIR ARCHIVO DE AUDIO =====
    st.subheader("Subir archivo de audio")
    uploaded_file = st.file_uploader(
        "Selecciona un archivo de audio",
        type=list(AUDIO_EXTENSIONS),
        key=f"audio_uploader_{st.session_state.upload_key_counter}"
    )
    
    if uploaded_file is not None:
        audio_bytes = uploaded_file.read()
        if len(audio_bytes) > 0:
            filename = uploaded_file.name
            
            success, recording_id = process_audio_file(audio_bytes, filename, recorder, db_utils)
            
            if success:
                # Reset el widget para que no se procese nuevamente
                st.session_state.upload_key_counter += 1
    
    st.caption("Formatos soportados: MP3, WAV, M4A")

# ============================================================================
# PANEL DERECHO - Audios Guardados y Transcripción
# ============================================================================
with col_right:
    # Refresh de la lista de audios
    recordings = recorder.get_recordings_from_supabase()
    st.session_state.recordings = recordings
    
    # Actualizar mapeo de IDs para análisis de oportunidades
    update_recordings_map()
    
    if recordings:
        # Tabs para diferentes secciones
        tab1, tab2, tab3 = st.tabs(["Transcribir", "Audios guardados", "Gestión en lote"])
        
        # ===== TAB 1: TRANSCRIBIR =====
        with tab1:
            # Filtrar audios (reutilizar la búsqueda si existe)
            search_query = st.session_state.get("audio_search", "")
            if search_query and search_query.strip():
                search_safe = re.escape(search_query.strip())
                filtered_recordings = [
                    r for r in recordings 
                    if search_safe.lower() in r.lower()
                ]
            else:
                filtered_recordings = recordings
        
            selected_audio = st.selectbox(
                "Selecciona un audio para transcribir",
                filtered_recordings,
                format_func=lambda x: format_recording_name(x) + (
                    " [Transcrito]" if is_audio_transcribed(x, db_utils) else ""
                ),
                key=f"selectbox_audio_{len(filtered_recordings)}"
            )
            
            if selected_audio:
                # Cargar transcripción existente automáticamente si existe
                if selected_audio != st.session_state.get("loaded_audio"):
                    existing_transcription = db_utils.get_transcription_by_filename(selected_audio)
                    if existing_transcription:
                        st.session_state.contexto = existing_transcription["content"]
                        st.session_state.selected_audio = selected_audio
                        st.session_state.loaded_audio = selected_audio
                        st.session_state.chat_enabled = True
                        st.session_state.keywords = {}
                        add_debug_event(f"Transcripción cargada para '{selected_audio}'", "success")
                    else:
                        st.session_state.selected_audio = selected_audio
                        st.session_state.loaded_audio = selected_audio
                        st.session_state.chat_enabled = False
                        st.session_state.contexto = None
                        st.session_state.keywords = {}
                
                # Mostrar reproductor de audio
                audio_path = recorder.get_recording_path(selected_audio)
                extension = selected_audio.split('.')[-1]
                
                # Verificar si el archivo existe antes de intentar abrirlo
                audio_file_path = Path(audio_path)
                if audio_file_path.exists():
                    try:
                        with open(audio_path, "rb") as f:
                            st.audio(f.read(), format=f"audio/{extension}")
                    except Exception as e:
                        logger.error(f"Error al reproducir audio: {e}")
                        show_error(f"Error al reproducir el audio: {str(e)}")
                else:
                    # Si el archivo no existe, intentar descargarlo de Supabase nuevamente
                    from backend.database import download_audio_from_storage
                    try:
                        if download_audio_from_storage(selected_audio, audio_path):
                            with open(audio_path, "rb") as f:
                                st.audio(f.read(), format=f"audio/{extension}")
                        else:
                            show_error("No se pudo descargar el audio desde el almacenamiento. Intenta más tarde.")
                    except Exception as e:
                        logger.error(f"Error al descargar/reproducir audio: {e}")
                        show_error(f"Error al procesar el audio: {str(e)}")
                
                st.markdown("")  # Espaciado
                
                col_transcribe, col_delete = st.columns([1, 1])
                
                with col_transcribe:
                    if st.button("Transcribir", use_container_width=True):
                        with st.spinner("Transcribiendo..."):
                            try:
                                audio_path = recorder.get_recording_path(selected_audio)
                                transcription = transcriber_model.transcript_audio(audio_path)
                                st.session_state.contexto = transcription.text
                                st.session_state.selected_audio = selected_audio
                                st.session_state.loaded_audio = selected_audio
                                st.session_state.chat_enabled = True
                                st.session_state.keywords = {}
                                
                                transcription_id = db_utils.save_transcription(
                                    recording_filename=selected_audio,
                                    content=transcription.text,
                                    language="es"
                                )
                                
                                show_success("Transcripción completada")
                                add_debug_event(f"Transcripción completada para '{selected_audio}' (ID: {transcription_id})", "success")
                                
                                # === ANÁLISIS AUTOMÁTICO DE OPORTUNIDADES CON IA ===
                                analysis_placeholder = st.empty()
                                with analysis_placeholder.container():
                                    st.markdown('''
                                    <div style="
                                        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
                                        border: 2px solid rgba(139, 92, 246, 0.3);
                                        border-radius: 12px;
                                        padding: 16px;
                                        margin: 12px 0;
                                        text-align: center;
                                    ">
                                        <div style="font-size: 14px; font-weight: 600; color: #8b5cf6; margin-bottom: 8px;">
                                            🤖 Generando Tickets Automáticamente...
                                        </div>
                                        <div style="font-size: 12px; color: #60a5fa;">
                                            Analizando intenciones y oportunidades con IA
                                        </div>
                                    </div>
                                    ''', unsafe_allow_html=True)
                                
                                opportunities_manager = OpportunitiesManager()
                                
                                # Obtener recording_id del mapeo
                                recordings_map = st.session_state.get("recordings_map", {})
                                rec_id = recordings_map.get(selected_audio)
                                
                                logger.info(f"[STREAMLIT] ========== ANÁLISIS DE IA INICIADO ==========")
                                logger.info(f"[STREAMLIT] selected_audio: '{selected_audio}'")
                                logger.info(f"[STREAMLIT] recordings_map keys: {list(recordings_map.keys())[:3]}...")
                                logger.info(f"[STREAMLIT] recording_id obtenido: {rec_id}")
                                logger.info(f"[STREAMLIT] transcription length: {len(transcription.text)} chars")
                                
                                try:
                                    num_opportunities, detected_opps = opportunities_manager.analyze_opportunities_with_ai(
                                        transcription=transcription.text,
                                        audio_filename=selected_audio,
                                        recording_id=rec_id
                                    )
                                    logger.info(f"[STREAMLIT] ✅ Análisis completado")
                                    logger.info(f"[STREAMLIT] Detectadas: {num_opportunities} | Guardadas: {len(detected_opps) if detected_opps else 0}")
                                except Exception as analysis_error:
                                    logger.error(f"[STREAMLIT] ❌ ERROR: {type(analysis_error).__name__}")
                                    logger.error(f"[STREAMLIT]    {str(analysis_error)}")
                                    num_opportunities = 0
                                    detected_opps = []
                                
                                logger.info(f"[STREAMLIT] ========== FIN DEL ANÁLISIS ==========\n")
                                
                                # Actualizar el indicador con los resultados
                                with analysis_placeholder.container():
                                    if num_opportunities > 0:
                                        # Determinar si se guardaron o solo se detectaron
                                        if detected_opps:
                                            tickets_status = f"Se han creado {len(detected_opps)} ticket(s) automáticamente"
                                            subtitle = "Los tickets están disponibles en la sección de 'Oportunidades'"
                                            icon = "✅"
                                        else:
                                            tickets_status = f"Se detectaron {num_opportunities} oportunidad(es)"
                                            subtitle = "Oportunidades identificadas por IA (pendiente almacenamiento)"
                                            icon = "🔍"
                                        
                                        st.markdown(f'''
                                        <div style="
                                            background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
                                            border: 2px solid rgba(34, 197, 94, 0.3);
                                            border-radius: 12px;
                                            padding: 16px;
                                            margin: 12px 0;
                                            text-align: center;
                                        ">
                                            <div style="font-size: 14px; font-weight: 600; color: #22c55e; margin-bottom: 8px;">
                                                {icon} Analisis Completado
                                            </div>
                                            <div style="font-size: 13px; color: #86efac; font-weight: 500;">
                                                {tickets_status}
                                            </div>
                                            <div style="font-size: 11px; color: #4ade80; margin-top: 6px;">
                                                {subtitle}
                                            </div>
                                        </div>
                                        ''', unsafe_allow_html=True)
                                        
                                        if detected_opps:
                                            toast_msg = f"Se han creado {len(detected_opps)} tickets automáticamente"
                                        else:
                                            toast_msg = f"Se detectaron {num_opportunities} oportunidades por IA"
                                        
                                        st.toast(toast_msg, icon="🤖")
                                        add_debug_event(
                                            f"IA detectó {num_opportunities} oportunidades para '{selected_audio}'",
                                            "success"
                                        )
                                    else:
                                        st.markdown('''
                                        <div style="
                                            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
                                            border: 2px solid rgba(59, 130, 246, 0.3);
                                            border-radius: 12px;
                                            padding: 16px;
                                            margin: 12px 0;
                                            text-align: center;
                                        ">
                                            <div style="font-size: 14px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">
                                                ℹ️ Análisis Completado
                                            </div>
                                            <div style="font-size: 13px; color: #93c5fd;">
                                                No se detectaron nuevas oportunidades en esta transcripción
                                            </div>
                                        </div>
                                        ''', unsafe_allow_html=True)
                                        
                                        st.toast(
                                            "ℹ️ Análisis completado: No se detectaron oportunidades relevantes.",
                                            icon="ℹ️"
                                        )
                                        add_debug_event(
                                            f"IA no detectó oportunidades para '{selected_audio}'",
                                            "info"
                                        )
                            except Exception as e:
                                show_error(f"Error al transcribir: {e}")
                
                with col_delete:
                    if st.button("Eliminar", use_container_width=True):
                        st.session_state.delete_confirmation[selected_audio] = True
                    
                    if st.session_state.delete_confirmation.get(selected_audio):
                        st.warning(f"⚠️ ¿Eliminar '{selected_audio}'?")
                        col_yes, col_no = st.columns(2)
                        with col_yes:
                            if st.button("Sí", key=f"confirm_yes_{selected_audio}"):
                                if delete_audio(selected_audio, recorder, db_utils):
                                    delete_recording_local(selected_audio)
                                    st.session_state.chat_enabled = False
                                    st.session_state.loaded_audio = None
                                    st.session_state.selected_audio = None
                                    st.session_state.delete_confirmation.pop(selected_audio, None)
                                    show_success(f"'{selected_audio}' eliminado")
                                    add_debug_event(f"Audio '{selected_audio}' eliminado", "success")
                                    st.rerun()
                        with col_no:
                            if st.button("No", key=f"confirm_no_{selected_audio}"):
                                st.session_state.delete_confirmation.pop(selected_audio, None)
                                st.rerun()
        
        # ===== TAB 2: AUDIOS GUARDADOS (BÚSQUEDA) =====
        with tab2:
            st.caption(f"Total: {len(recordings)} grabaciones")
            
            # Búsqueda
            search_query = st.text_input(
                "Buscar grabaciones",
                placeholder="Escribe el nombre del archivo...",
                key="audio_search"
            )
            
            # Filtrar audios
            if search_query.strip():
                search_safe = re.escape(search_query.strip())
                filtered_recordings = [
                    r for r in recordings 
                    if search_safe.lower() in r.lower()
                ]
                # Reset página al buscar
                st.session_state.audio_page = 0
            else:
                filtered_recordings = recordings
            
            # Paginación: 3 audios por página
            ITEMS_PER_PAGE = 3
            total_items = len(filtered_recordings)
            total_pages = (total_items + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE  # Redondeo hacia arriba
            
            # Asegurar que la página actual esté en rango válido
            if st.session_state.audio_page >= total_pages and total_pages > 0:
                st.session_state.audio_page = total_pages - 1
            elif st.session_state.audio_page < 0:
                st.session_state.audio_page = 0
            
            # Calcular índices de inicio y fin
            start_idx = st.session_state.audio_page * ITEMS_PER_PAGE
            end_idx = min(start_idx + ITEMS_PER_PAGE, total_items)
            
            # Obtener audios de la página actual
            paginated_recordings = filtered_recordings[start_idx:end_idx]
            
            # Mostrar resultados
            if filtered_recordings:
                st.markdown(f'''<div style="max-height: 500px; overflow-y: auto; margin-top: 12px;">''', unsafe_allow_html=True)
                
                for recording in paginated_recordings:
                    display_name = format_recording_name(recording)
                    is_transcribed = is_audio_transcribed(recording, db_utils)
                    transcribed_badge = components.render_badge("Transcrito", "transcribed") if is_transcribed else ""
                    
                    # Verificar si este audio está siendo editado
                    if st.session_state.editing_audio == recording:
                        # Modo edición: input + botones confirmación
                        col_input, col_confirm, col_cancel = st.columns([0.75, 0.125, 0.125])
                        
                        with col_input:
                            new_name = st.text_input(
                                "Nuevo nombre",
                                value=st.session_state.new_audio_name,
                                key=f"rename_input_{recording}",
                                placeholder="Escribe el nuevo nombre...",
                                label_visibility="collapsed"
                            )
                            st.session_state.new_audio_name = new_name
                        
                        with col_confirm:
                            if st.button("✓", key=f"confirm_rename_{recording}", help="Confirmar", use_container_width=True):
                                if new_name.strip():
                                    # Agregar extensión si no la tiene
                                    old_ext = Path(recording).suffix
                                    if not new_name.endswith(old_ext):
                                        new_filename = new_name + old_ext
                                    else:
                                        new_filename = new_name
                                    
                                    # Actualizar en Supabase
                                    success = db_utils.update_recording_filename(recording, new_filename)
                                    
                                    if success:
                                        st.session_state.recordings = recorder.get_recordings_from_supabase()
                                        st.session_state.editing_audio = None
                                        st.session_state.new_audio_name = ""
                                        show_success(f"✓ Renombrado a: {new_filename}")
                                        st.rerun()
                                    else:
                                        show_error("Error al renombrar")
                                else:
                                    show_warning("El nombre no puede estar vacío")
                        
                        with col_cancel:
                            if st.button("✕", key=f"cancel_rename_{recording}", help="Cancelar", use_container_width=True):
                                st.session_state.editing_audio = None
                                st.session_state.new_audio_name = ""
                                st.rerun()
                    else:
                        # Modo normal: mostrar audio con botón lápiz
                        col_info, col_edit = st.columns([0.9, 0.1])
                        
                        with col_info:
                            st.markdown(f'''
                            <div class="glass-card-hover" style="padding: 12px; margin: 8px 0; border-radius: 12px; background: rgba(42, 45, 62, 0.5); border: 1px solid rgba(139, 92, 246, 0.1); cursor: pointer;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-weight: 600;">{display_name}</div>
                                    <div style="margin-left: 16px;">{transcribed_badge}</div>
                                </div>
                                <div style="font-size: 11px; color: var(--muted-foreground); margin-top: 6px;">Selecciona en la pestaña "Transcribir"</div>
                            </div>
                            ''', unsafe_allow_html=True)
                        
                        with col_edit:
                            st.write("")  # Espaciado vertical
                            if st.button("✏️", key=f"edit_btn_{recording}", help="Renombrar"):
                                st.session_state.editing_audio = recording
                                st.session_state.new_audio_name = format_recording_name(recording).replace(" [Transcrito]", "")
                                st.rerun()
                
                st.markdown('</div>', unsafe_allow_html=True)
                
                # Controles de paginación (solo si hay más de 1 página)
                if total_pages > 1:
                    st.markdown("---")
                    
                    # Crear botones de paginación
                    col_buttons = st.columns(total_pages)
                    for page_num in range(total_pages):
                        with col_buttons[page_num]:
                            button_style = "active" if page_num == st.session_state.audio_page else ""
                            if st.button(
                                str(page_num + 1),
                                key=f"audio_page_{page_num}",
                                use_container_width=True,
                                disabled=(page_num == st.session_state.audio_page)
                            ):
                                st.session_state.audio_page = page_num
                                st.rerun()
            else:
                st.info(f"No se encontraron grabaciones para '{search_query}'")
        
        # ===== TAB 3: GESTIÓN EN LOTE =====
        with tab3:
            st.subheader("Eliminar múltiples audios")
            
            audios_to_delete = st.multiselect(
                "Audios a eliminar:",
                recordings,
                format_func=lambda x: format_recording_name(x)
            )
            
            if audios_to_delete:
                show_warning(f"Vas a eliminar {len(audios_to_delete)} audio(s)")
                
                for audio in audios_to_delete:
                    st.write(f"  • {audio}")
                
                col_confirm, col_cancel = st.columns(2)
                with col_confirm:
                    if st.button("Eliminar seleccionados", type="primary", use_container_width=True):
                        with st.spinner(f"Eliminando {len(audios_to_delete)} audio(s)..."):
                            deleted_count = 0
                            for audio in audios_to_delete:
                                if delete_audio(audio, recorder, db_utils):
                                    delete_recording_local(audio)
                                    deleted_count += 1
                            
                            st.session_state.chat_enabled = False
                            st.session_state.selected_audio = None
                            
                            if deleted_count > 0:
                                show_success(f"{deleted_count} audio(s) eliminado(s)")
                                st.rerun()
    else:
        st.info("No hay grabaciones guardadas. Comienza grabando o subiendo audio.")

st.markdown("")
st.markdown("")
st.markdown("")

# SECCIÓN DE TRANSCRIPCIÓN

if st.session_state.get("chat_enabled", False) and st.session_state.get("contexto"):
    # Indicador visual del audio activo (fixed)
    selected_audio_name = st.session_state.get('selected_audio', 'audio')
    
    st.markdown(f'''
    <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #0a1929;
        padding: 10px 14px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 999;
        max-width: 240px;
    ">
        <div style="font-size: 12px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">{selected_audio_name}</div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #00ff00;">
            <span style="width: 6px; height: 6px; background: #00ff00; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
            en línea
        </div>
    </div>
    <style>
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; }}
            50% {{ opacity: 0.5; }}
        }}
    </style>
    ''', unsafe_allow_html=True)
    
    st.header("Transcripción del Audio")
    
    # Mostrar transcripción con colores por persona
    with st.container(border=True):
        render_colorful_transcription(st.session_state.contexto)
    
    # Botones de acción para transcripción con colores personalizados
    col_trans1, col_trans2, col_trans3 = st.columns(3)
    
    with col_trans1:
        if st.button("Email", use_container_width=True, key="email_transcript_btn"):
            st.session_state.show_email_transcript = True
            st.rerun()
    
    with col_trans2:
        if st.button("WhatsApp", use_container_width=True, key="whatsapp_transcript_btn"):
            st.session_state.show_whatsapp_transcript = True
            st.rerun()
    
    with col_trans3:
        if st.button("Generar Resumen", use_container_width=True, key="generar_resumen_btn"):
            st.session_state.generating_summary = True
            st.rerun()
    
    # CSS simple para colorear los botones
    st.markdown(
        """
        <style>
        /* Email button - Red Gmail */
        [key="email_transcript_btn"] {
            background-color: #EA4335 !important;
            color: white !important;
        }
        [key="email_transcript_btn"]:hover {
            background-color: #d33425 !important;
        }
        
        /* WhatsApp button - Green */
        [key="whatsapp_transcript_btn"] {
            background-color: #25D366 !important;
            color: white !important;
        }
        [key="whatsapp_transcript_btn"]:hover {
            background-color: #20ba5a !important;
        }
        
        /* Generar Resumen button - Blue gradient */
        [key="generar_resumen_btn"] {
            background: linear-gradient(135deg, #0066FF, #00AAFF) !important;
            color: white !important;
        }
        [key="generar_resumen_btn"]:hover {
            background: linear-gradient(135deg, #0052CC, #0099FF) !important;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    
    # Modal para transcripción por email
    if st.session_state.get("show_email_transcript"):
        st.markdown("---")
        st.markdown('<h4 style="color: white;">✉️ Enviar Transcripción por Email</h4>', unsafe_allow_html=True)
        
        recipient_email = st.text_input("Email del destinatario:", placeholder="ejemplo@correo.com", key="email_transcript_input", label_visibility="collapsed")
        
        # Validar email en tiempo real
        email_valid = recipient_email and "@" in recipient_email and "." in recipient_email
        
        col_email_action, col_email_close = st.columns([1, 3])
        
        if email_valid:
            from backend.sharing import generate_email_link, format_content_for_sharing
            
            content = format_content_for_sharing(
                st.session_state.get('selected_audio', 'audio'),
                st.session_state.contexto,
                is_summary=False
            )
            
            email_link = generate_email_link(
                recipient_email,
                f"Transcripción - {st.session_state.get('selected_audio', 'audio')}",
                content
            )
            
            with col_email_action:
                st.markdown(f'<a href="{email_link}" target="_blank"><button style="background-color: #EA4335; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">Abrir Gmail</button></a>', unsafe_allow_html=True)
        else:
            with col_email_action:
                st.button("Abrir Gmail", disabled=True, use_container_width=True, key="gmail_disabled_transcript")
        
        with col_email_close:
            if st.button("Cancelar", use_container_width=True, key="cancel_email_transcript"):
                st.session_state.show_email_transcript = False
                st.rerun()
        
        if recipient_email and not email_valid:
            show_error_expanded("❌ Email inválido. Debe contener @ y un dominio (ej: ejemplo@correo.com)")
    
    # Modal para transcripción por WhatsApp
    if st.session_state.get("show_whatsapp_transcript"):
        st.markdown("---")
        st.markdown('<h4 style="color: white;">💬 Enviar Transcripción por WhatsApp</h4>', unsafe_allow_html=True)
        
        phone_number = st.text_input(
            "Número WhatsApp:",
            placeholder="+34632123456",
            key="whatsapp_transcript_input",
            label_visibility="collapsed"
        )
        
        # Validar teléfono en tiempo real
        phone_valid = phone_number and phone_number.startswith("+") and len(phone_number) >= 10 and phone_number[1:].isdigit()
        
        col_wa_action, col_wa_close = st.columns([1, 3])
        
        if phone_valid:
            from backend.sharing import generate_whatsapp_link, format_content_for_sharing
            
            content = format_content_for_sharing(
                st.session_state.get('selected_audio', 'audio'),
                st.session_state.contexto,
                is_summary=False
            )
            
            whatsapp_url = generate_whatsapp_link(phone_number, content)
            
            with col_wa_action:
                st.markdown(f'<a href="{whatsapp_url}" target="_blank"><button style="background-color: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">Abrir WhatsApp</button></a>', unsafe_allow_html=True)
        else:
            with col_wa_action:
                st.button("Abrir WhatsApp", disabled=True, use_container_width=True, key="whatsapp_disabled_transcript")
        
        with col_wa_close:
            if st.button("Cancelar", use_container_width=True, key="cancel_whatsapp_transcript"):
                st.session_state.show_whatsapp_transcript = False
                st.rerun()
        
        if phone_number and not phone_valid:
            show_error_expanded("❌ Número inválido. Debe empezar con + y contener al menos 10 dígitos (ej: +34632123456)")



    
    # Mostrar resumen si se está generando o existe
    if st.session_state.get("generating_summary"):
        with st.spinner("Generando resumen con IA..."):
            try:
                resumen = chat_model.call_model(
                    "Por favor genera un resumen profesional y conciso. Incluye: 1) Tema principal, 2) Puntos clave discutidos, 3) Decisiones o acciones importantes.",
                    st.session_state.contexto
                )
                st.session_state.summary_text = resumen
                st.session_state.generating_summary = False
                st.rerun()
            except Exception as e:
                show_error_expanded(f"Error al generar resumen: {str(e)}")
                st.session_state.generating_summary = False
    
    # Mostrar resumen si existe
    if st.session_state.get("summary_text"):
        st.markdown('<h3 style="color: white; margin-top: 20px;">📋 Resumen Generado</h3>', unsafe_allow_html=True)
        
        # Mostrar el resumen con botón de copiar integrado de Streamlit
        st.code(st.session_state.summary_text, language="text")
        
        # Botones de acción
        col_actions1, col_actions2, col_actions3 = st.columns(3)
        
        with col_actions1:
            if st.button("📧 Email", use_container_width=True, type="secondary", key="email_summary_btn"):
                st.session_state.show_email_modal = True
                st.rerun()
        
        with col_actions2:
            if st.button("💬 WhatsApp", use_container_width=True, type="secondary", key="whatsapp_summary_btn"):
                st.session_state.show_whatsapp_modal = True
                st.rerun()
        
        with col_actions3:
            if st.button("🗑️ Limpiar", use_container_width=True):
                st.session_state.summary_text = None
                st.rerun()
        
        # Modal para enviar por email
        if st.session_state.get("show_email_modal"):
            st.markdown("---")
            st.markdown('<h4 style="color: white;">✉️ Enviar Resumen por Email</h4>', unsafe_allow_html=True)
            
            recipient_email = st.text_input("Email del destinatario:", placeholder="ejemplo@correo.com", key="email_summary_input", label_visibility="collapsed")
            
            # Validar email en tiempo real
            email_valid = recipient_email and "@" in recipient_email and "." in recipient_email
            
            col_email_action, col_email_close = st.columns([1, 3])
            
            if email_valid:
                from backend.sharing import generate_email_link, format_content_for_sharing
                
                content = format_content_for_sharing(
                    st.session_state.get('selected_audio', 'audio'),
                    st.session_state.summary_text,
                    is_summary=True
                )
                
                email_link = generate_email_link(
                    recipient_email,
                    f"Resumen - {st.session_state.get('selected_audio', 'audio')}",
                    content
                )
                
                with col_email_action:
                    st.markdown(f'<a href="{email_link}" target="_blank"><button style="background-color: #EA4335; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">Abrir Gmail</button></a>', unsafe_allow_html=True)
            else:
                with col_email_action:
                    st.button("Abrir Gmail", disabled=True, use_container_width=True, key="gmail_disabled_summary")
            
            with col_email_close:
                if st.button("Cancelar", use_container_width=True, key="cancel_email_summary"):
                    st.session_state.show_email_modal = False
                    st.rerun()
            
            if recipient_email and not email_valid:
                show_error_expanded("❌ Email inválido. Debe contener @ y un dominio (ej: ejemplo@correo.com)")
        
        # Modal para enviar por WhatsApp
        if st.session_state.get("show_whatsapp_modal"):
            st.markdown("---")
            st.markdown('<h4 style="color: white;">💬 Enviar Resumen por WhatsApp</h4>', unsafe_allow_html=True)
            
            phone_number = st.text_input(
                "Número WhatsApp:",
                placeholder="+34632123456",
                key="whatsapp_summary_input",
                label_visibility="collapsed"
            )
            
            # Validar teléfono en tiempo real
            phone_valid = phone_number and phone_number.startswith("+") and len(phone_number) >= 10 and phone_number[1:].isdigit()
            
            col_wa_action, col_wa_close = st.columns([1, 3])
            
            if phone_valid:
                from backend.sharing import generate_whatsapp_link, format_content_for_sharing
                
                content = format_content_for_sharing(
                    st.session_state.get('selected_audio', 'audio'),
                    st.session_state.summary_text,
                    is_summary=True
                )
                
                whatsapp_url = generate_whatsapp_link(phone_number, content)
                
                with col_wa_action:
                    st.markdown(f'<a href="{whatsapp_url}" target="_blank"><button style="background-color: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">Abrir WhatsApp</button></a>', unsafe_allow_html=True)
            else:
                with col_wa_action:
                    st.button("Abrir WhatsApp", disabled=True, use_container_width=True, key="whatsapp_disabled_summary")
            
            with col_wa_close:
                if st.button("Cancelar", use_container_width=True, key="cancel_whatsapp_summary"):
                    st.session_state.show_whatsapp_modal = False
                    st.rerun()
            
            if phone_number and not phone_valid:
                show_error_expanded("❌ Número inválido. Debe empezar con + y contener al menos 10 dígitos (ej: +34632123456)")


        
        st.markdown("")
                    
    
    # SECCIÓN DE PALABRAS CLAVE
    st.markdown('<h3 style="color: white;">Palabras Clave</h3>', unsafe_allow_html=True)
    st.caption("Añade palabras clave para el análisis de oportunidades")
    
    col_kw1, col_kw2 = st.columns([2, 1])
    with col_kw1:
        new_keyword = st.text_input("Palabra clave:", placeholder="Ej: presupuesto", label_visibility="collapsed")
    with col_kw2:
        if st.button("Añadir", use_container_width=True, type="secondary"):
            if new_keyword:
                # Limpiar espacios y convertir a minúsculas
                cleaned_keyword = new_keyword.strip().lower()
                
                # Validar que no esté vacío después de limpiar
                if not cleaned_keyword:
                    show_error_expanded("La palabra clave no puede estar vacía")
                # Validar que no sea duplicada
                elif cleaned_keyword in st.session_state.get("keywords", {}):
                    show_warning_expanded(f"'{cleaned_keyword}' ya fue añadida")
                else:
                    if "keywords" not in st.session_state:
                        st.session_state.keywords = {}
                    st.session_state.keywords[cleaned_keyword] = cleaned_keyword
                    show_success_expanded(f"'{cleaned_keyword}' añadida")
                    st.rerun()
            else:
                show_error_expanded("Ingresa una palabra clave")
    
    # Mostrar palabras clave
    keywords_dict = st.session_state.get("keywords", {})
    if keywords_dict:
        st.markdown('<h4 style="color: white; margin-top: 20px; margin-bottom: 16px;">Palabras clave configuradas</h4>', unsafe_allow_html=True)
        
        # Mostrar palabras clave con botones de eliminar al lado
        for keyword in list(keywords_dict.keys()):
            col_badge, col_delete = st.columns([4, 1])
            
            with col_badge:
                # Badge HTML con palabra
                badge_html = f'<div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #0052CC 0%, #003d99 100%); padding: 8px 12px; border-radius: 6px; color: white; font-weight: 500; font-size: 14px;">{keyword}</div>'
                st.markdown(badge_html, unsafe_allow_html=True)
            
            with col_delete:
                if st.button("✕", key=f"del_{keyword}", use_container_width=True, help="Eliminar"):
                    delete_keyword_local(keyword)  # Actualización local instantánea
                    st.rerun()  # ACTUALIZAR UI inmediatamente
        
        # Separador visual
        st.markdown("")
        
        # Botón para generar oportunidades
        if st.button("Analizar y Generar Tickets de Oportunidades", use_container_width=True, type="primary"):
            with st.spinner("Analizando transcripción..."):
                keywords_list = list(st.session_state.keywords.keys())
                opportunities = opp_manager.extract_opportunities(
                    st.session_state.contexto,
                    keywords_list
                )
                
                saved_count = 0
                for opp in opportunities:
                    opp_manager.save_opportunity(opp, st.session_state.selected_audio)
                    saved_count += 1
                
                if saved_count > 0:
                    show_success_expanded(f"{saved_count} ticket(s) de oportunidad generado(s)")
                    add_debug_event(f"Generados {saved_count} ticket(s) de oportunidad", "success")
                    st.session_state.show_opportunities = True
                else:
                    show_warning_expanded("No se encontraron oportunidades con las palabras clave")

st.markdown("")
st.markdown("")
st.markdown("")

# SECCIÓN DE OPORTUNIDADES

if st.session_state.get("chat_enabled", False):
    selected_audio = st.session_state.get("selected_audio", "")
    opportunities = opp_manager.load_opportunities(selected_audio)
    
    if opportunities:
        st.markdown('<h2 style="color: white;">Tickets de Oportunidades de Negocio</h2>', unsafe_allow_html=True)
        
        # Paginación de tickets
        TICKETS_PER_PAGE = 5
        total_tickets = len(opportunities)
        total_pages = (total_tickets + TICKETS_PER_PAGE - 1) // TICKETS_PER_PAGE
        
        if 'tickets_page' not in st.session_state:
            st.session_state.tickets_page = 0
            
        if st.session_state.tickets_page >= total_pages and total_pages > 0:
            st.session_state.tickets_page = total_pages - 1
        elif st.session_state.tickets_page < 0:
            st.session_state.tickets_page = 0
            
        start_idx = st.session_state.tickets_page * TICKETS_PER_PAGE
        end_idx = min(start_idx + TICKETS_PER_PAGE, total_tickets)
        paginated_opportunities = opportunities[start_idx:end_idx]

        for idx, opp in enumerate(paginated_opportunities):
            # Usar el índice original para las keys de los widgets
            original_idx = start_idx + idx
            
            expander_title = f"{opp['keyword']} - {opp['created_at']}"
            is_expanded = st.session_state.get(f"expander_{original_idx}", False)

            with st.expander(expander_title, expanded=is_expanded):
                # Usar un formulario para evitar recargas al cambiar los valores
                with st.form(key=f"form_{original_idx}"):
                    col_opp1, col_opp2 = st.columns([3, 2])
                    
                    with col_opp1:
                        st.markdown("**Contexto encontrado en el audio:**")
                        
                        # Usar markdown para resaltar la palabra clave
                        highlighted_context = opp['full_context'].replace(
                            opp['keyword'],
                            f"**{opp['keyword']}**"
                        )
                        st.markdown(f"> {highlighted_context}")

                        new_notes = st.text_area(
                            "Notas y resumen:",
                            value=opp.get('notes', ''),
                            placeholder="Escribe el resumen de esta oportunidad de negocio...",
                            height=120
                        )
                    
                    with col_opp2:
                        st.markdown("**Estado:**")
                        status_options = {"Nuevo": "new", "En progreso": "in_progress", "Cerrado": "closed", "Ganado": "won"}
                        status_display_names = list(status_options.keys())
                        current_status = opp.get('status', 'new')
                        current_status_label = [k for k, v in status_options.items() if v == current_status][0]
                        selected_status_label = st.selectbox(
                            "Cambiar estado",
                            status_display_names,
                            index=status_display_names.index(current_status_label),
                            label_visibility="collapsed"
                        )
                        new_status = status_options[selected_status_label]
                        
                        st.markdown("**Prioridad:**")
                        priority_options = {"Baja": "Low", "Media": "Medium", "Alta": "High"}
                        priority_display_names = list(priority_options.keys())
                        current_priority = opp.get('priority', 'Medium')
                        current_priority_label = [k for k, v in priority_options.items() if v == current_priority][0]
                        selected_priority_label = st.selectbox(
                            "Cambiar prioridad",
                            priority_display_names,
                            index=priority_display_names.index(current_priority_label),
                            label_visibility="collapsed"
                        )
                        new_priority = priority_options[selected_priority_label]

                    # Botones en columnas
                    col_btn1, col_btn2 = st.columns(2)
                    with col_btn1:
                        submitted = st.form_submit_button("Guardar cambios", use_container_width=True, type="primary")
                    with col_btn2:
                        # Placeholder para mantener el layout
                        st.markdown("")
                    
                    if submitted:
                        updates = {
                            "notes": new_notes,
                            "status": new_status,
                            "priority": new_priority
                        }
                        if opp_manager.update_opportunity(opp['id'], updates):
                            update_opportunity_local(original_idx, updates)
                            show_success_expanded("✓ Cambios guardados")
                            st.rerun()
                        else:
                            show_error_expanded("⚠️ Error al guardar")
                
                # Botón de eliminar FUERA del formulario
                col_del1, col_del2 = st.columns([1, 1])
                with col_del2:
                    if st.button("Eliminar ticket", key=f"delete_{original_idx}", use_container_width=True):
                        st.session_state.opp_delete_confirmation[original_idx] = True
                        st.rerun()
                
                if st.session_state.opp_delete_confirmation.get(original_idx):
                    st.warning(f"⚠️ ¿Estás seguro de eliminar '{opp['keyword']}'?")
                    col_yes, col_no = st.columns(2)
                    with col_yes:
                        if st.button("Sí, eliminar", key=f"opp_confirm_yes_{original_idx}", use_container_width=True):
                            if opp_manager.delete_opportunity(opp['id']):
                                delete_opportunity_local(original_idx)
                                st.session_state.opp_delete_confirmation.pop(original_idx, None)
                                show_success_expanded("✓ Oportunidad eliminada")
                                st.rerun()
                    with col_no:
                        if st.button("Cancelar", key=f"opp_confirm_no_{original_idx}", use_container_width=True):
                            st.session_state.opp_delete_confirmation.pop(original_idx, None)
                            st.rerun()

        # Controles de paginación de tickets
        if total_pages > 1:
            st.markdown("---")
            
            # Crear botones de paginación
            col_buttons = st.columns(total_pages)
            for page_num in range(total_pages):
                with col_buttons[page_num]:
                    if st.button(
                        str(page_num + 1),
                        key=f"ticket_page_{page_num}",
                        use_container_width=True,
                        disabled=(page_num == st.session_state.tickets_page)
                    ):
                        st.session_state.tickets_page = page_num
                        st.rerun()

st.markdown("")
st.markdown("")
st.markdown("")

# SECCIÓN DE CHAT

if st.session_state.get("chat_enabled", False):
    st.header("Asistente IA para Análisis de Reuniones")
    st.caption(f"Conversando sobre: {st.session_state.get('selected_audio', 'audio')}")
    
    if st.session_state.get("keywords"):
        keywords_list = list(st.session_state.get("keywords", {}).keys())
        if keywords_list:
            show_info_debug(f"Palabras clave activas: {', '.join(keywords_list)}")
    
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
        # Mensaje de bienvenida inicial
        st.session_state.chat_history.append("🤖 **IA**: Hola, soy tu asistente de análisis. Estoy aquí para ayudarte a entender tu reunión y extraer información relevante. Cuéntame qué te gustaría analizar.")
    
    # Mostrar historial de chat con estilo profesional
    if st.session_state.chat_history:
        st.markdown("""
        <div class="chat-container">
        """, unsafe_allow_html=True)
        
        for message in st.session_state.chat_history:
            if message.startswith("👤"):
                # Mensaje del usuario
                user_text = message.replace("👤 **Usuario**: ", "")
                st.markdown(f"""
                <div class="chat-message chat-message-user">
                    <div class="chat-avatar chat-avatar-user avatar-pulse">�</div>
                    <div class="chat-bubble chat-bubble-user">{user_text}</div>
                </div>
                """, unsafe_allow_html=True)
            elif message.startswith("🤖"):
                # Mensaje de la IA
                ai_text = message.replace("🤖 **IA**: ", "")
                st.markdown(f"""
                <div class="chat-message chat-message-ai">
                    <div class="chat-avatar chat-avatar-ai avatar-spin">✨</div>
                    <div class="chat-bubble chat-bubble-ai">{ai_text}</div>
                </div>
                """, unsafe_allow_html=True)
        
        st.markdown("</div>", unsafe_allow_html=True)
    
    # Campo de entrada centrado
    col_left, col_input, col_right = st.columns([1, 3, 1])
    with col_input:
        user_input = st.chat_input("Escribe tu pregunta o solicitud de análisis...")
    
    if user_input:
        st.session_state.chat_history.append(f"👤 **Usuario**: {user_input}")
        
        with st.spinner("Generando respuesta..."):
            try:
                # Pasar palabras clave al modelo
                keywords = st.session_state.get("keywords", {})
                response = chat_model.call_model(user_input, st.session_state.contexto, keywords)
                st.session_state.chat_history.append(f"🤖 **IA**: {response}")
                
                # Limitar historial a últimos N mensajes para no sobrecargar memoria
                max_history = st.session_state.chat_history_limit
                if len(st.session_state.chat_history) > max_history:
                    st.session_state.chat_history = st.session_state.chat_history[-max_history:]
                
                st.rerun()
            except Exception as e:
                show_error(f"Error al generar respuesta: {e}")
else:
    show_info_expanded("Carga un audio y transcríbelo para habilitar el chat.")

st.markdown("")
st.markdown("")
st.markdown("")

# PANEL DE ADMINISTRACIÓN
if is_superadmin():
    with st.expander("⚙️ Administración de usuarios", expanded=False):
        render_admin_panel()

# SECCIÓN DEBUG
with st.expander("🔧 DEBUG - Estado de base de datos"):
    show_info_debug("Probando conexión a PostgreSQL...")
    try:
        from database import init_db
        db = init_db()
        if db:
            with db.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM recordings")
                record_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM opportunities")
                opp_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM transcriptions")
                trans_count = cur.fetchone()[0]
 
            show_success_debug("¡Conexión PostgreSQL establecida!")
            show_success_debug(f"Grabaciones en BD: {record_count}")
            show_success_debug(f"Oportunidades en BD: {opp_count}")
            show_success_debug(f"Transcripciones en BD: {trans_count}")
        else:
            show_error_debug("No se pudo conectar a PostgreSQL. Verifica DATABASE_URL.")
    except Exception as e:
        show_error_debug(f"Error de conexión: {str(e)}")
        show_info_debug("Posibles soluciones:")
        st.write("1. Verifica que DATABASE_URL esté configurada en Coolify")
        st.write("2. Verifica que el contenedor PostgreSQL esté corriendo")
        st.write("3. Verifica usuario y contraseña de audio_user")
 
    st.markdown("---")
    st.markdown("**📋 Registro de Eventos:**")
    debug_log = st.session_state.get("debug_log", [])
    if debug_log:
        for event in debug_log[-20:]:
            time = event.get("time", "??:??:??")
            event_type = event.get("type", "info")
            message = event.get("message", "")
            if event_type == "success":
                st.success(f"[{time}] ✓ {message}")
            elif event_type == "error":
                st.error(f"[{time}] ✗ {message}")
            else:
                st.info(f"[{time}] ℹ {message}")
    else:
        st.write("Sin eventos registrados aún")
