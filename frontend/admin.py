"""admin.py - Panel de administración de usuarios para superadmin"""
import streamlit as st
import bcrypt
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))
from database import init_db
from logger import get_logger

logger = get_logger(__name__)

SUPERADMIN_EMAILS = ["infra@iautomatiza.net", "dev@iautomatiza.net"]


def is_superadmin() -> bool:
    user = st.session_state.get("user")
    return user and user.get("email") in SUPERADMIN_EMAILS


def get_all_users():
    db = init_db()
    if not db:
        return []
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, email, name, role, company, active, created_at FROM users ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            return [
                {
                    "id": r[0], "email": r[1], "name": r[2],
                    "role": r[3], "company": r[4],
                    "active": r[5], "created_at": r[6]
                }
                for r in rows
            ]
    except Exception as e:
        logger.error(f"get_all_users: {e}")
        return []


def create_user(email: str, password: str, name: str, role: str, company: str) -> bool:
    db = init_db()
    if not db:
        return False
    try:
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        with db.cursor() as cur:
            cur.execute(
                """INSERT INTO users (email, password_hash, name, role, company, active, created_at)
                   VALUES (%s, %s, %s, %s, %s, TRUE, %s)""",
                (email.strip().lower(), password_hash, name, role, company, datetime.now())
            )
        logger.info(f"✅ Usuario creado: {email}")
        return True
    except Exception as e:
        logger.error(f"create_user: {e}")
        return False


def toggle_user_active(user_id: int, active: bool) -> bool:
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("UPDATE users SET active=%s WHERE id=%s", (active, user_id))
        return True
    except Exception as e:
        logger.error(f"toggle_user_active: {e}")
        return False


def delete_user(user_id: int) -> bool:
    db = init_db()
    if not db:
        return False
    try:
        with db.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
        return True
    except Exception as e:
        logger.error(f"delete_user: {e}")
        return False


def render_admin_panel():
    """Renderiza el panel de administración de usuarios"""
    if not is_superadmin():
        st.error("Acceso denegado — solo superadmins")
        return

    st.markdown('<h2 style="color:white;">Panel de administración</h2>', unsafe_allow_html=True)

    # ── Crear nuevo usuario ──────────────────────────────────────
    with st.expander("➕ Crear nuevo usuario", expanded=False):
        with st.form("create_user_form"):
            col1, col2 = st.columns(2)
            with col1:
                new_email = st.text_input("Email *")
                new_name = st.text_input("Nombre *")
                new_company = st.text_input("Empresa")
            with col2:
                new_password = st.text_input("Contraseña *", type="password")
                new_role = st.selectbox("Rol", ["user", "admin"])

            if st.form_submit_button("Crear usuario", use_container_width=True):
                if not new_email or not new_password or not new_name:
                    st.error("Email, nombre y contraseña son obligatorios")
                elif create_user(new_email, new_password, new_name, new_role, new_company):
                    st.success(f"✅ Usuario {new_email} creado")
                    st.rerun()
                else:
                    st.error("Error al crear usuario. ¿El email ya existe?")

    # ── Lista de usuarios ────────────────────────────────────────
    st.markdown("### Usuarios registrados")
    users = get_all_users()

    if not users:
        st.info("No hay usuarios registrados")
        return

    current_user_email = st.session_state.get("user", {}).get("email")

    for u in users:
        with st.container():
            col1, col2, col3, col4 = st.columns([3, 2, 1, 1])
            with col1:
                status = "🟢" if u["active"] else "🔴"
                st.markdown(f"{status} **{u['name']}**  \n`{u['email']}`")
            with col2:
                st.markdown(f"_{u['company'] or '—'}_  \n`{u['role']}`")
            with col3:
                if u["email"] != current_user_email:
                    label = "Desactivar" if u["active"] else "Activar"
                    if st.button(label, key=f"toggle_{u['id']}"):
                        toggle_user_active(u["id"], not u["active"])
                        st.rerun()
            with col4:
                if u["email"] not in SUPERADMIN_EMAILS:
                    if st.button("Eliminar", key=f"del_{u['id']}"):
                        st.session_state[f"confirm_del_{u['id']}"] = True
                        st.rerun()

            if st.session_state.get(f"confirm_del_{u['id']}"):
                st.warning(f"¿Eliminar a {u['email']}? Esta acción no se puede deshacer.")
                c1, c2 = st.columns(2)
                with c1:
                    if st.button("Sí, eliminar", key=f"yes_del_{u['id']}"):
                        delete_user(u["id"])
                        st.session_state.pop(f"confirm_del_{u['id']}", None)
                        st.rerun()
                with c2:
                    if st.button("Cancelar", key=f"no_del_{u['id']}"):
                        st.session_state.pop(f"confirm_del_{u['id']}", None)
                        st.rerun()

            st.divider()
