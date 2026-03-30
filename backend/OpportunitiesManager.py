"""OpportunitiesManager.py - Extrae oportunidades (migrado a PostgreSQL)"""
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import streamlit as st
import sys
import google.generativeai as genai
import re
import psycopg2
import psycopg2.extras

sys.path.insert(0, str(Path(__file__).parent.parent))
from logger import get_logger
from database import init_db
from helpers import safe_json_dump
from config import GEMINI_API_KEY

logger = get_logger(__name__)
BASE_DIR = Path(__file__).parent.parent / "data" / "opportunities"
KEYWORDS_DICT_PATH = Path(__file__).parent.parent / "keywords_dict.json"

# Configurar Gemini
genai.configure(api_key=GEMINI_API_KEY)

class OpportunitiesManager:
    def __init__(self):
        BASE_DIR.mkdir(parents=True, exist_ok=True)
        self.db = init_db()

    def get_recording_id(self, filename: str) -> Optional[int]:
        """Obtiene ID del recording - intenta múltiples variaciones del nombre"""
        if not self.db:
            logger.warning(f"DB unavailable: {filename}")
            return None
        try:
            with self.db.cursor() as cur:
                # Búsqueda exacta
                cur.execute("SELECT id FROM recordings WHERE filename=%s", (filename,))
                row = cur.fetchone()
                if row:
                    logger.info(f"✅ Recording encontrado (exacto): {row[0]}")
                    return row[0]

                # Sin extensión
                filename_no_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
                cur.execute("SELECT id FROM recordings WHERE filename=%s", (filename_no_ext,))
                row = cur.fetchone()
                if row:
                    logger.info(f"✅ Recording encontrado (sin extensión): {row[0]}")
                    return row[0]

                # Coincidencia parcial
                main_part = filename.split(" - ")[0].strip()[:20] if " - " in filename else filename_no_ext[:20]
                cur.execute("SELECT id, filename FROM recordings ORDER BY created_at DESC LIMIT 20")
                rows = cur.fetchall()
                for rec_id, rec_filename in rows:
                    if main_part.lower() in rec_filename.lower():
                        logger.info(f"✅ Recording encontrado (parcial): {rec_id} ({rec_filename})")
                        return rec_id

            logger.error(f"❌ Recording no encontrado: {filename}")
            return None
        except Exception as e:
            logger.error(f"get_recording_id: {type(e).__name__} - {str(e)}")
            return None

    def extract_opportunities(self, transcription: str, keywords_list: List[str]) -> List[Dict]:
        """Extrae oportunidades de keywords en transcripción"""
        if not keywords_list:
            return []

        opportunities, words = [], transcription.lower().split()
        for keyword in keywords_list:
            occurrence_count = 0
            for i, word in enumerate(words):
                if keyword.lower() not in word:
                    continue
                occurrence_count += 1
                context_window = 15
                start, end = max(0, i - context_window), min(len(words), i + context_window + 1)
                opportunity = {
                    "id": f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{keyword}_{occurrence_count}",
                    "keyword": keyword,
                    "context_before": " ".join(words[start:i]),
                    "context_after": " ".join(words[i+1:end]),
                    "full_context": f"{' '.join(words[start:i])} **{keyword}** {' '.join(words[i+1:end])}",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "status": "new",
                    "notes": "",
                    "occurrence": occurrence_count,
                    "priority": "Medium",
                    "title": keyword
                }
                opportunities.append(opportunity)
        return opportunities

    def save_opportunity(self, opportunity: Dict, audio_filename: str) -> bool:
        """Guarda oportunidad en BD/local"""
        if not self.db:
            logger.warning(f"BD unavailable, saving locally: {audio_filename}")
            return self._save_local(opportunity, audio_filename)
        try:
            recording_id = self.get_recording_id(audio_filename)
            if not recording_id:
                logger.warning("Recording ID not found, fallback local")
                return self._save_local(opportunity, audio_filename)

            priority = opportunity.get("priority", "Medium").capitalize()
            with self.db.cursor() as cur:
                cur.execute("""
                    INSERT INTO opportunities (recording_id, title, description, created_at)
                    VALUES (%s, %s, %s, %s) RETURNING id
                """, (
                    recording_id,
                    opportunity.get("keyword", "Opportunity"),
                    opportunity.get("full_context", ""),
                    datetime.now()
                ))
                opp_id = cur.fetchone()[0]
                opportunity["id"] = opp_id
                logger.info(f"✓ Opportunity saved: {opp_id}")
                return True
        except Exception as e:
            logger.error(f"save_opportunity: {type(e).__name__} - {str(e)}")
            return self._save_local(opportunity, audio_filename)

    def _save_local(self, opportunity: Dict, audio_filename: str) -> bool:
        """Fallback: guarda JSON localmente"""
        filename = f"opp_{audio_filename.replace('.', '_')}_{opportunity['id']}.json"
        return safe_json_dump(opportunity, filename, BASE_DIR)

    def load_opportunities(self, audio_filename: str) -> List[Dict]:
        """Carga oportunidades desde BD/local"""
        if not self.db:
            return self._load_local(audio_filename)
        try:
            recording_id = self.get_recording_id(audio_filename)
            if not recording_id:
                return self._load_local(audio_filename)

            with self.db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM opportunities WHERE recording_id=%s", (recording_id,))
                rows = cur.fetchall()

            if not rows:
                return []

            return [{
                "id": r["id"],
                "keyword": r.get("title", ""),
                "full_context": r.get("description", ""),
                "status": r.get("status", "new"),
                "notes": r.get("notes", ""),
                "priority": r.get("priority", "Medium"),
                "created_at": str(r.get("created_at", "")),
                "occurrence": 1
            } for r in rows]
        except Exception as e:
            logger.error(f"load_opportunities: {type(e).__name__} - {str(e)}")
            return self._load_local(audio_filename)

    def _load_local(self, audio_filename: str) -> List[Dict]:
        """Carga oportunidades de archivos JSON locales"""
        opportunities = []
        try:
            pattern = f"opp_{audio_filename.replace('.', '_')}_*.json"
            for filepath in BASE_DIR.glob(pattern):
                with open(filepath, "r", encoding="utf-8") as f:
                    opportunities.append(json.load(f))
            return opportunities
        except:
            return []

    def update_opportunity(self, opportunity_id: int, updates: Dict) -> bool:
        """Actualiza oportunidad"""
        if not self.db:
            return False
        try:
            set_clause = ", ".join([f"{k}=%s" for k in updates.keys()])
            values = list(updates.values()) + [opportunity_id]
            with self.db.cursor() as cur:
                cur.execute(f"UPDATE opportunities SET {set_clause} WHERE id=%s", values)
            logger.info(f"✓ Opportunity updated: {opportunity_id}")
            return True
        except Exception as e:
            logger.error(f"update_opportunity: {type(e).__name__} - {str(e)}")
            return False

    def delete_opportunity(self, opportunity_id: int) -> bool:
        """Elimina oportunidad"""
        if not self.db:
            return False
        try:
            with self.db.cursor() as cur:
                cur.execute("DELETE FROM opportunities WHERE id=%s", (opportunity_id,))
            logger.info(f"✓ Opportunity deleted: {opportunity_id}")
            return True
        except Exception as e:
            logger.error(f"delete_opportunity: {type(e).__name__} - {str(e)}")
            return False

    def load_keywords_dict(self) -> Dict:
        """Carga el diccionario de keywords desde JSON"""
        try:
            if not KEYWORDS_DICT_PATH.exists():
                return {}
            with open(KEYWORDS_DICT_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading keywords dict: {type(e).__name__} - {str(e)}")
            return {}

    def extract_speakers_from_transcription(self, transcription: str) -> Dict[str, List[str]]:
        """Extrae speakers y sus fragmentos de la transcripción"""
        speakers = {}
        try:
            pattern = r'^([^:]+):\s*["\']?(.+?)["\']?\s*$'
            for line in transcription.split('\n'):
                line = line.strip()
                if not line:
                    continue
                match = re.match(pattern, line)
                if match:
                    speaker = match.group(1).strip()
                    text = match.group(2).strip()
                    if speaker not in speakers:
                        speakers[speaker] = []
                    speakers[speaker].append(text)
            return speakers if speakers else {"Unknown": [transcription]}
        except Exception as e:
            logger.error(f"Error extracting speakers: {type(e).__name__} - {str(e)}")
            return {"Unknown": [transcription]}

    def analyze_opportunities_with_ai(
        self,
        transcription: str,
        audio_filename: str,
        recording_id: int = None
    ) -> Tuple[int, List[Dict]]:
        """Análisis inteligente de oportunidades usando Gemini"""
        try:
            keywords_dict = self.load_keywords_dict()
            if not keywords_dict:
                return 0, []

            speakers = self.extract_speakers_from_transcription(transcription)
            temas = keywords_dict.get("temas_de_interes", {})
            config = keywords_dict.get("configuracion", {})

            if not temas:
                return 0, []

            speakers_list = ", ".join(speakers.keys())
            transcription_limited = transcription[:12000] if len(transcription) > 12000 else transcription

            prompt = f"""CRÍTICO: Analiza esta conversación/reunión palabra por palabra. Detecta TODAS las oportunidades que encuentres.

MAPEO SIMPLE:
• Presupuesto / dinero / gasto / inversión / coste → "Presupuesto" (HIGH)
• Contactar / llamar / tarea / acción / hacer / pendiente / debe / responsabilidad → "Acción requerida" (HIGH)
• Regulación / ley / cumplimiento / compliance / auditoría / riesgo legal → "Cumplimiento Legal" (HIGH)
• Formación / capacitación / entrenamiento / curso / educación → "Formación" (MEDIUM)
• Contratar / empleado / personal / equipo / rol / recurso humano → "Recursos Humanos" (MEDIUM)
• Cliente / venta / deal / contrato / negocio / oportunidad / acuerdo → "Cierre de venta" (HIGH)
• Decisión / cambio / estrategia / importante / aprobado → "Decisión importante" (HIGH)
• Herramienta / infraestructura / sistema / plataforma / equipo tecnológico → "Infraestructura" (MEDIUM)

TRANSCRIPCIÓN:
{transcription_limited}

SPEAKERS: {speakers_list}

RESPONDE SOLO CON JSON (sin markdown, sin explicaciones):

{{"analisis_completo": true, "oportunidades": [{{"tema": "TemaExacto", "prioridad": "high/medium/low", "mencionado_por": "Nombre", "contexto": "frase", "confianza": 0.85}}]}}

Si no hay oportunidades: {{"analisis_completo": true, "oportunidades": []}}"""

            model = genai.GenerativeModel(config.get("modelo_gemini", "gemini-2.0-flash"))
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            # Limpiar markdown
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            try:
                response_json = json.loads(response_text)
            except json.JSONDecodeError:
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start >= 0 and end > start:
                    response_json = json.loads(response_text[start:end])
                else:
                    return 0, []

            oportunidades_data = response_json.get("oportunidades", [])
            if not oportunidades_data:
                return 0, []

            # Obtener o crear recording_id
            recording_id = recording_id or self.get_recording_id(audio_filename)
            if not recording_id and self.db:
                try:
                    with self.db.cursor() as cur:
                        cur.execute("""
                            INSERT INTO recordings (filename, filepath, created_at)
                            VALUES (%s, %s, %s) RETURNING id
                        """, (audio_filename, "", datetime.now()))
                        recording_id = cur.fetchone()[0]
                        logger.info(f"✅ Recording creado: {recording_id}")
                except Exception as e:
                    logger.error(f"Error creando recording: {e}")

            if not recording_id:
                return len(oportunidades_data), []

            min_confianza = float(config.get("minimo_confianza", 0.5))
            saved_opportunities = []

            for idx, opp in enumerate(oportunidades_data, 1):
                try:
                    tema = str(opp.get("tema", "")).strip()
                    mencionado_por = str(opp.get("mencionado_por", "Unknown")).strip()
                    contexto = str(opp.get("contexto", "")).strip()
                    confianza = float(opp.get("confianza", 0.8))
                    prioridad_str = str(opp.get("prioridad", "medium")).lower().strip()

                    if tema not in temas or confianza < min_confianza or not contexto:
                        continue

                    priority_map = {"high": "High", "medium": "Medium", "low": "Low"}
                    priority = priority_map.get(prioridad_str, "Medium")

                    tema_data = temas.get(tema, {})
                    nota = (
                        f"🤖 TICKET GENERADO AUTOMÁTICAMENTE\n\n"
                        f"📌 Tema: {tema}\n"
                        f"📝 Descripción: {tema_data.get('descripcion', '')}\n"
                        f"👤 Mencionado por: {mencionado_por}\n"
                        f"💬 Contexto: {contexto}\n"
                        f"🎯 Confianza: {confianza:.0%}"
                    )

                    if not self.db:
                        continue

                    with self.db.cursor() as cur:
                        cur.execute("""
                            INSERT INTO opportunities (recording_id, title, description, created_at)
                            VALUES (%s, %s, %s, %s) RETURNING id
                        """, (
                            recording_id,
                            f"[IA] {tema} - {mencionado_por}",
                            contexto,
                            datetime.now()
                        ))
                        opp_id = cur.fetchone()[0]
                        logger.info(f"✅ Opp {idx} guardada: {opp_id}")
                        saved_opportunities.append({"id": opp_id, "title": tema})

                except Exception as inner_e:
                    logger.error(f"❌ Opp {idx}: {type(inner_e).__name__} - {str(inner_e)[:150]}")

            logger.info(f"🎯 ANÁLISIS COMPLETADO: {len(saved_opportunities)} guardadas / {len(oportunidades_data)} detectadas")
            return len(oportunidades_data), saved_opportunities

        except Exception as e:
            logger.error(f"analyze_opportunities_with_ai: {type(e).__name__} - {str(e)}")
            return 0, []
