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
    .login-container {
        max-width: 420px;
        margin: 80px auto 0;
        padding: 40px;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 16px;
    }
    .login-title {
        text-align: center;
        font-size: 28px;
        font-weight: 700;
        color: white;
        margin-bottom: 8px;
    }
    .login-subtitle {
        text-align: center;
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 32px;
    }
    </style>
    """, unsafe_allow_html=True)

    st.markdown('<div class="login-container">', unsafe_allow_html=True)
    st.markdown('<div class="login-title">🎙️ iECO</div>', unsafe_allow_html=True)
    st.markdown('<div class="login-subtitle">Sistema de grabación y análisis con IA</div>', unsafe_allow_html=True)

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

    st.markdown('</div>', unsafe_allow_html=True)
