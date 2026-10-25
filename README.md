# SmartFit — Assignment 4 updated prototype

## Requirements
- Python 3.10+ recommended
- Internet is not required to run the app locally after packages are installed.

## Run on Windows
1. Extract this folder. Open it in VS Code.
2. Open Terminal → New Terminal.
3. Create a virtual environment (recommended): `py -m venv .venv`
4. Activate it: `.venv\Scripts\activate`
5. Install dependencies: `python -m pip install -r requirements.txt`
6. Start server: `python -m uvicorn main:app --reload`
7. Open `http://127.0.0.1:8000`.

## Features
- GET `/` reads records from SQLite.
- POST `/add_user` inserts a record with parameterised SQL and redirects back to the page.
- Responsive design, SVG logo, optimised WebP hero image, descriptive alt text and CSS animation.
- Animation respects `prefers-reduced-motion`; no sound is played automatically.

## Important limitations
This is a student prototype, not production-ready account software. The current database stores demo profiles and does not implement login or per-user access control. Use synthetic test data only. Before submission, run the app on your own laptop, test the POST and GET flows, and capture real browser Network measurements and screenshots.
