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
    /* Ocultar elementos de Streamlit */
    #MainMenu, header, footer,
    [data-testid="stHeader"],
    [data-testid="stToolbar"],
    [data-testid="stDecoration"],
    [data-testid="stStatusWidget"],
    .stDeployButton { display: none !important; }

    /* Fondo oscuro full-screen */
    html, body, [data-testid="stAppViewContainer"],
    [data-testid="stAppViewContainer"] > div:first-child {
        background: #0f172a !important;
        min-height: 100vh;
    }

    /* Quitar padding del bloque principal */
    [data-testid="stMainBlockContainer"],
    .block-container {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }

    /* Centrar verticalmente el contenido */
    [data-testid="stVerticalBlock"] {
        gap: 0 !important;
    }

    /* Tarjeta de login */
    .login-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
    }

    .login-card {
        width: 100%;
        max-width: 400px;
        background: rgba(30, 41, 59, 0.95);
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 20px;
        padding: 48px 40px 40px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139,92,246,0.1);
        margin: auto;
    }

    .login-logo {
        text-align: center;
        font-size: 48px;
        line-height: 1;
        margin-bottom: 12px;
    }

    .login-title {
        text-align: center;
        font-size: 30px;
        font-weight: 800;
        color: #f1f5f9;
        letter-spacing: -0.5px;
        margin-bottom: 6px;
    }

    .login-subtitle {
        text-align: center;
        font-size: 14px;
        color: #64748b;
        margin-bottom: 36px;
    }

    /* Inputs */
    [data-testid="stTextInput"] label {
        color: #94a3b8 !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        letter-spacing: 0.3px;
    }

    [data-testid="stTextInput"] input {
        background: rgba(15, 23, 42, 0.8) !important;
        border: 1px solid rgba(139, 92, 246, 0.2) !important;
        border-radius: 10px !important;
        color: #f1f5f9 !important;
        font-size: 15px !important;
        padding: 12px 16px !important;
        transition: border-color 0.2s;
    }

    [data-testid="stTextInput"] input:focus {
        border-color: rgba(139, 92, 246, 0.6) !important;
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
    }

    /* Botón */
    [data-testid="stForm"] [data-testid="stBaseButton-secondaryFormSubmit"],
    [data-testid="stForm"] button[kind="secondaryFormSubmit"],
    [data-testid="stFormSubmitButton"] button {
        background: linear-gradient(135deg, #7c3aed, #0ea5e9) !important;
        border: none !important;
        border-radius: 10px !important;
        color: white !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        padding: 12px !important;
        margin-top: 8px !important;
        transition: opacity 0.2s, transform 0.1s !important;
    }

    [data-testid="stFormSubmitButton"] button:hover {
        opacity: 0.9 !important;
        transform: translateY(-1px) !important;
    }

    /* Alertas */
    [data-testid="stAlert"] {
        border-radius: 10px !important;
        margin-top: 12px !important;
    }
    </style>
    """, unsafe_allow_html=True)

    # Wrapper para centrado vertical
    st.markdown('<div class="login-wrapper"><div class="login-card">', unsafe_allow_html=True)
    st.markdown('<div class="login-logo">🎙️</div>', unsafe_allow_html=True)
    st.markdown('<div class="login-title">iECO</div>', unsafe_allow_html=True)
    st.markdown('<div class="login-subtitle">Sistema de grabación y análisis con IA</div>', unsafe_allow_html=True)

    with st.form("login_form"):
        email = st.text_input("Email", placeholder="tu@empresa.com", label_visibility="visible")
        password = st.text_input("Contraseña", type="password", label_visibility="visible")
        submit = st.form_submit_button("Entrar", use_container_width=True)

        if submit:
            if not email or not password:
                st.error("Introduce email y contraseña")
            elif login(email, password):
                st.rerun()
            else:
                st.error("Email o contraseña incorrectos")

    st.markdown('</div></div>', unsafe_allow_html=True)
