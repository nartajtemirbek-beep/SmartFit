from pathlib import Path
import sqlite3
from contextlib import closing
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "smartfit.db"
app = FastAPI(title="SmartFit", description="Student fitness tracking prototype")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

def init_db():
    with closing(sqlite3.connect(DB_PATH)) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, goal TEXT NOT NULL, weight REAL NOT NULL CHECK(weight > 0))")
        conn.commit()

init_db()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, message: str = ""):
    with closing(sqlite3.connect(DB_PATH)) as conn:
        users = conn.execute("SELECT id, name, goal, weight FROM users ORDER BY id DESC").fetchall()
        stats = conn.execute("SELECT COUNT(*), COUNT(DISTINCT LOWER(TRIM(goal))) FROM users").fetchone()
        goal_counts = conn.execute(
            "SELECT goal, COUNT(*) AS entries FROM users "
            "GROUP BY LOWER(TRIM(goal)) ORDER BY entries DESC, goal ASC LIMIT 5"
        ).fetchall()
    return templates.TemplateResponse(request, "index.html", {"users": users, "message": message, "stats": stats, "goal_counts": goal_counts})

@app.post("/add_user")
async def add_user(name: str = Form(...), goal: str = Form(...), weight: float = Form(...)):
    name, goal = name.strip(), goal.strip()
    if not name or not goal or not (0 < weight <= 500):
        return RedirectResponse(url="/?message=Please+enter+valid+details", status_code=303)
    with closing(sqlite3.connect(DB_PATH)) as conn:
        conn.execute("INSERT INTO users (name, goal, weight) VALUES (?, ?, ?)", (name[:60], goal[:120], weight))
        conn.commit()
    return RedirectResponse(url="/?message=Progress+entry+saved+successfully", status_code=303)
