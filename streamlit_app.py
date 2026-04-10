#!/usr/bin/env python3
"""
streamlit_app.py - Entrada principal con autenticación
"""
import sys
import os
from pathlib import Path

app_root = Path(__file__).parent
backend_path = str(app_root / "backend")
frontend_path = str(app_root / "frontend")
sys.path.insert(0, backend_path)
sys.path.insert(0, frontend_path)
sys.path.insert(0, str(app_root))

os.chdir(app_root)

from auth import is_authenticated, render_login_page

if not is_authenticated():
    render_login_page()
else:
    import runpy
    index_path = str(app_root / "frontend" / "index.py")
    runpy.run_path(index_path, run_name="__main__")
