"""auth.py - Sistema de autenticación para ieco"""
import streamlit as st
import bcrypt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from database import init_db
from logger import get_logger

logger = get_logger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña contra hash bcrypt"""
    try:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception as e:
        logger.error(f"Error verificando contraseña: {e}")
        return False


def get_user_by_email(email: str):
    """Obtiene usuario de la BD por email"""
    db = init_db()
    if not db:
        return None
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash, name, role, company, active FROM users WHERE email=%s",
                (email.strip().lower(),)
            )
            row = cur.fetchone()
            if row:
                return {
                    "id": row[0],
                    "email": row[1],
                    "password_hash": row[2],
                    "name": row[3],
                    "role": row[4],
                    "company": row[5],
                    "active": row[6]
                }
        return None
    except Exception as e:
        logger.error(f"get_user_by_email: {e}")
        return None


def login(email: str, password: str) -> bool:
    """Intenta loguear al usuario. Devuelve True si éxito."""
    user = get_user_by_email(email)
    if not user:
        return False
    if not user["active"]:
        return False
    if not verify_password(password, user["password_hash"]):
        return False

    st.session_state.user = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "company": user["company"]
    }
    st.session_state.authenticated = True
    logger.info(f"✅ Login exitoso: {email}")
    return True


def logout():
    """Cierra la sesión del usuario"""
    st.session_state.authenticated = False
    st.session_state.user = None
    st.session_state.clear()


def is_authenticated() -> bool:
    """Comprueba si hay sesión activa"""
    return st.session_state.get("authenticated", False)


def is_admin() -> bool:
    """Comprueba si el usuario es admin"""
    user = st.session_state.get("user")
    return user and user.get("role") == "admin"


def render_login_page():
    """Renderiza la página de login"""
    st.set_page_config(
        page_title="iECO — Acceso",
        page_icon="🎙️",
        layout="centered"
    )

    st.markdown("""
    <style>
    /* Ocultar todos los elementos de Streamlit innecesarios */
    #MainMenu, header, footer,
    [data-testid="stHeader"],
    [data-testid="stToolbar"],
    [data-testid="stDecoration"],
    [data-testid="stStatusWidget"],
    [data-testid="stSidebarCollapsedControl"],
    .stDeployButton { display: none !important; }

    /* Fondo oscuro full-screen */
    html, body {
        background: #0f172a !important;
    }
    [data-testid="stAppViewContainer"] {
        background: #0f172a !important;
        min-height: 100vh;
    }

    /* Centrar verticalmente el bloque principal */
    [data-testid="stMainBlockContainer"],
    .block-container {
        max-width: 440px !important;
        padding: 0 20px !important;
        margin: 0 auto !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        min-height: 100vh !important;
    }

    /* Header del login (logo + título + subtítulo) */
    .login-header {
        text-align: center;
        margin-bottom: 28px;
    }
    .login-logo {
        font-size: 52px;
        line-height: 1.1;
        margin-bottom: 8px;
    }
    .login-title {
        font-size: 32px;
        font-weight: 800;
        color: #f1f5f9;
        letter-spacing: -0.5px;
        margin: 0 0 6px 0;
    }
    .login-subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 0;
    }

    /* Formulario: quitarle el borde por defecto de Streamlit */
    [data-testid="stForm"] {
        background: rgba(30, 41, 59, 0.95) !important;
        border: 1px solid rgba(139, 92, 246, 0.25) !important;
        border-radius: 20px !important;
        padding: 32px !important;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5) !important;
    }

    /* Labels */
    [data-testid="stTextInput"] label {
        color: #94a3b8 !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    /* Inputs */
    [data-testid="stTextInput"] input {
        background: rgba(15, 23, 42, 0.8) !important;
        border: 1px solid rgba(139, 92, 246, 0.2) !important;
        border-radius: 10px !important;
        color: #f1f5f9 !important;
        font-size: 15px !important;
    }
    [data-testid="stTextInput"] input:focus {
        border-color: rgba(139, 92, 246, 0.6) !important;
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
    }

    /* Botón submit */
    [data-testid="stFormSubmitButton"] button {
        background: linear-gradient(135deg, #7c3aed, #0ea5e9) !important;
        border: none !important;
        border-radius: 10px !important;
        color: white !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        margin-top: 6px !important;
        transition: opacity 0.2s !important;
    }
    [data-testid="stFormSubmitButton"] button:hover {
        opacity: 0.88 !important;
    }

    /* Alertas */
    [data-testid="stAlert"] {
        border-radius: 10px !important;
        margin-top: 10px !important;
    }
    </style>
    """, unsafe_allow_html=True)

    # Cabecera: logo + título (HTML puro, sin envolver el form)
    st.markdown("""
    <div class="login-header">
        <div class="login-logo">🎙️</div>
        <div class="login-title">iECO</div>
        <div class="login-subtitle">Sistema de grabación y análisis con IA</div>
    </div>
    """, unsafe_allow_html=True)

    with st.form("login_form"):
        email = st.text_input("Email", placeholder="tu@empresa.com")
        password = st.text_input("Contraseña", type="password")
        submit = st.form_submit_button("Entrar", use_container_width=True)

        if submit:
            if not email or not password:
                st.error("Introduce email y contraseña")
            elif login(email, password):
                st.rerun()
            else:
                st.error("Email o contraseña incorrectos")
