# Code 2 Chill Backend (FastAPI)

This backend is designed to connect to the supplied React + Vite frontend.

## Requirements
- Python 3.10+
- pip

## Run on macOS / Linux
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open:
- API health: http://127.0.0.1:8000/health
- Interactive API docs: http://127.0.0.1:8000/docs

Keep the frontend API origin as `http://127.0.0.1:8000` in `frontend/src/lib/api.js`.

## Local admin account
- Email: `admin@code2chill.local`
- Password: `Admin@12345`

Sign up as a member from the website. New accounts are pending until an admin approves them in the Admin Dashboard.

## Important notes
- Data is stored in `data/code2chill.db` (SQLite).
- Uploaded files are stored in `uploads/`.
- Set a strong `SECRET_KEY` environment variable before deploying.
- Set `CORS_ORIGINS` to your deployed frontend origin before deployment.
- Password reset currently returns a development reset token in `dev_note`; configure a real email provider before production.
- This is a local development backend scaffold. Some advanced workflows (real email delivery, QR verification, PDF certificate generation, event capacity rules, and detailed dashboard analytics) need production-specific configuration and testing.
