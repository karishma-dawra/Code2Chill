# CODE 2 CHILL — Full Project (Frontend + Backend)

## Project structure
- `frontend/` — React + Vite website
- `backend/` — FastAPI backend with SQLite

## Run locally on macOS

### 1. Start backend (Terminal 1)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Backend: http://127.0.0.1:8000
API docs: http://127.0.0.1:8000/docs

### 2. Start frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (normally http://127.0.0.1:5173).

The frontend API helper is already configured to use `http://127.0.0.1:8000`. Keep both servers running while using the site.

## Local admin account
- Email: `admin@code2chill.local`
- Password: `Admin@12345`

Change the development credentials and configure a strong `SECRET_KEY`, allowed CORS origins, and real email delivery before any public deployment.

## Notes
- `node_modules/` and Python virtual environments are intentionally not included; install dependencies using the commands above.
- Backend data is stored in `backend/data/` and uploads in `backend/uploads/` when the server runs.
- This is a local development project. Advanced workflows may require further production configuration and testing; see `backend/README.md`.
