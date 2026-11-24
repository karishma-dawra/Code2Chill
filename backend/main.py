from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional
import sqlite3, json, os, hmac, hashlib, base64, time, secrets, re
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
UPLOADS = BASE / "uploads"
DATA.mkdir(exist_ok=True)
UPLOADS.mkdir(exist_ok=True)
DB = DATA / "code2chill.db"
SECRET = os.getenv("SECRET_KEY", "CHANGE_THIS_SECRET_KEY_BEFORE_DEPLOYING")
TOKEN_TTL = 60 * 60 * 24 * 7

app = FastAPI(title="Code 2 Chill API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(","),
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")

def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with db() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL, phone TEXT DEFAULT '', role TEXT DEFAULT 'member',
          status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, profile TEXT DEFAULT '{}'
        );
        CREATE TABLE IF NOT EXISTS records(
          id INTEGER PRIMARY KEY AUTOINCREMENT, bucket TEXT NOT NULL, payload TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_records_bucket ON records(bucket);
        """)
        admin = con.execute("SELECT id FROM users WHERE email=?", ("admin@code2chill.local",)).fetchone()
        if not admin:
            con.execute("INSERT INTO users(name,email,password_hash,role,status) VALUES(?,?,?,?,?)",
                ("C2C Admin","admin@code2chill.local",hash_password("Admin@12345"),"admin","approved"))
def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180000)
    return base64.b64encode(salt + digest).decode()

def verify_password(password, encoded):
    try:
        raw = base64.b64decode(encoded)
        salt, expected = raw[:16], raw[16:]
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

init_db()

def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def make_token(user):
    payload = {"sub": user["id"], "exp": int(time.time()) + TOKEN_TTL}
    body = b64(json.dumps(payload).encode())
    sig = b64(hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest())
    return body + "." + sig

def current_user(request: Request, required=True):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        if required: raise HTTPException(401, "Please log in.")
        return None
    try:
        body, sig = auth[7:].split(".", 1)
        expected = b64(hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected): raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if payload["exp"] < time.time(): raise ValueError()
        with db() as con:
            row = con.execute("SELECT * FROM users WHERE id=?", (payload["sub"],)).fetchone()
        if not row or row["status"] != "approved": raise HTTPException(403, "Your membership is not active.")
        return user_dict(row)
    except HTTPException:
        raise
    except Exception:
        if required: raise HTTPException(401, "Invalid or expired login session.")
        return None

def user_dict(row):
    profile = json.loads(row["profile"] or "{}")
    return {"id": row["id"], "name": row["name"], "email": row["email"], "phone": row["phone"],
            "role": row["role"], "status": row["status"], **profile}

def admin_user(request: Request):
    user = current_user(request)
    if user["role"] != "admin": raise HTTPException(403, "Admin access required.")
    return user

def get_record(bucket, rid):
    with db() as con:
        row = con.execute("SELECT * FROM records WHERE bucket=? AND id=?", (bucket, rid)).fetchone()
    if not row: return None
    return {"id": row["id"], **json.loads(row["payload"]), "created_at": row["created_at"], "updated_at": row["updated_at"]}

def list_records(bucket):
    with db() as con:
        rows = con.execute("SELECT * FROM records WHERE bucket=? ORDER BY id DESC", (bucket,)).fetchall()
    return [{"id": r["id"], **json.loads(r["payload"]), "created_at": r["created_at"], "updated_at": r["updated_at"]} for r in rows]

def save_record(bucket, payload, rid=None):
    payload = dict(payload or {})
    with db() as con:
        if rid:
            old = con.execute("SELECT id FROM records WHERE bucket=? AND id=?", (bucket, rid)).fetchone()
            if not old: raise HTTPException(404, "Record not found.")
            con.execute("UPDATE records SET payload=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND bucket=?",
                        (json.dumps(payload), rid, bucket))
            return get_record(bucket, rid)
        cur = con.execute("INSERT INTO records(bucket,payload) VALUES(?,?)", (bucket, json.dumps(payload)))
        return get_record(bucket, cur.lastrowid)

def delete_record(bucket, rid):
    with db() as con:
        cur = con.execute("DELETE FROM records WHERE bucket=? AND id=?", (bucket, rid))
    if not cur.rowcount: raise HTTPException(404, "Record not found.")
    return {"message": "Deleted."}

@app.get("/")
def root():
    return {"name":"Code 2 Chill API","status":"running","docs":"/docs"}

@app.get("/health")
def health():
    return {"status":"ok"}

@app.post("/api/auth/signup")
def signup(data: dict):
    name = str(data.get("name","")).strip()
    email = str(data.get("email","")).strip().lower()
    password = str(data.get("password",""))
    if not name or not email or len(password) < 8:
        raise HTTPException(400, "Enter your name, a valid email and a password of at least 8 characters.")
    try:
        with db() as con:
            con.execute("INSERT INTO users(name,email,password_hash,phone,profile) VALUES(?,?,?,?,?)",
                        (name,email,hash_password(password),str(data.get("phone","")),json.dumps({k:v for k,v in data.items() if k not in ("name","email","password","phone")})))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists.")
    return {"message":"Account created. Your membership is pending Admin approval."}

@app.post("/api/auth/login")
def login(data: dict):
    email = str(data.get("email","")).strip().lower()
    with db() as con:
        row = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not row or not verify_password(str(data.get("password","")), row["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    if row["status"] != "approved":
        raise HTTPException(403, "Your membership is pending Admin approval.")
    user = user_dict(row)
    return {"access_token": make_token(user), "token_type":"bearer", "user":user}

@app.post("/api/auth/forgot-password")
def forgot_password(data: dict):
    email = str(data.get("email","")).strip().lower()
    with db() as con:
        row = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    # Local development helper; production must send a real email and never expose reset tokens.
    if not row: return {"message":"If the account exists, reset instructions will be sent."}
    token = secrets.token_urlsafe(32)
    save_record("password_reset", {"user_id":row["id"],"token":token,"used":False})
    return {"message":"Password reset token generated for local development.", "dev_note":f"Development reset token: {token}"}

@app.post("/api/auth/reset-password")
def reset_password(data: dict):
    token, password = str(data.get("token","")), str(data.get("password",""))
    if len(password) < 8: raise HTTPException(400, "Password must contain at least 8 characters.")
    matches = [r for r in list_records("password_reset") if r.get("token")==token and not r.get("used")]
    if not matches: raise HTTPException(400, "Invalid or expired reset token.")
    rec = matches[0]
    with db() as con:
        con.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(password), rec["user_id"]))
    rec["used"] = True
    save_record("password_reset", rec, rec["id"])
    return {"message":"Password updated successfully."}

@app.get("/api/me")
def me(request: Request):
    return current_user(request)

@app.patch("/api/me")
def update_me(data: dict, request: Request):
    user = current_user(request)
    allowed = {"name","phone","college","course","year","bio","linkedin","github"}
    updates = {k:v for k,v in data.items() if k in allowed}
    with db() as con:
        row = con.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
        profile = json.loads(row["profile"] or "{}")
        profile.update({k:v for k,v in updates.items() if k not in ("name","phone")})
        con.execute("UPDATE users SET name=?,phone=?,profile=? WHERE id=?",
                    (updates.get("name",row["name"]),updates.get("phone",row["phone"]),json.dumps(profile),user["id"]))
    return me(request)

@app.get("/api/admin/dashboard")
def admin_dashboard(request: Request):
    admin_user(request)
    with db() as con:
        total = con.execute("SELECT COUNT(*) n FROM users").fetchone()["n"]
        pending = con.execute("SELECT COUNT(*) n FROM users WHERE status='pending'").fetchone()["n"]
        approved = con.execute("SELECT COUNT(*) n FROM users WHERE status='approved'").fetchone()["n"]
        events = con.execute("SELECT COUNT(*) n FROM records WHERE bucket='events'").fetchone()["n"]
    return {"total_members":total,"pending_members":pending,"approved_members":approved,"total_events":events}

@app.get("/api/admin/members")
def admin_members(request: Request, status: Optional[str]=None, page:int=1, page_size:int=20, search:Optional[str]=None):
    admin_user(request)
    with db() as con:
        query = "SELECT * FROM users WHERE 1=1"; args=[]
        if status: query += " AND status=?"; args.append(status)
        if search: query += " AND (name LIKE ? OR email LIKE ?)"; args.extend([f"%{search}%",f"%{search}%"])
        total = con.execute("SELECT COUNT(*) n FROM ("+query+")",args).fetchone()["n"]
        rows = con.execute(query+" ORDER BY id DESC LIMIT ? OFFSET ?",args+[page_size,(page-1)*page_size]).fetchall()
    return {"items":[user_dict(r) for r in rows],"members":[user_dict(r) for r in rows],"total":total,"page":page,"page_size":page_size}

@app.patch("/api/admin/members/{uid}/status")
def member_status(uid:int, data:dict, request:Request):
    admin_user(request); status=data.get("status")
    if status not in ("pending","approved","rejected","suspended"): raise HTTPException(400,"Invalid member status.")
    with db() as con:
        cur=con.execute("UPDATE users SET status=? WHERE id=?",(status,uid))
    if not cur.rowcount: raise HTTPException(404,"Member not found.")
    return {"message":"Member status updated.","status":status}

@app.patch("/api/admin/members/{uid}")
def member_update(uid:int,data:dict,request:Request):
    admin_user(request)
    allowed={"name","phone","role"}
    with db() as con:
        row=con.execute("SELECT * FROM users WHERE id=?",(uid,)).fetchone()
        if not row: raise HTTPException(404,"Member not found.")
        con.execute("UPDATE users SET name=?,phone=?,role=? WHERE id=?",
                    (data.get("name",row["name"]),data.get("phone",row["phone"]),data.get("role",row["role"]),uid))
    return {"message":"Member updated."}

@app.get("/api/admin/members/{uid}/history")
def member_history(uid:int,request:Request):
    admin_user(request)
    return {"registrations":[],"certificates":[],"activity":[]}

@app.get("/api/me/registrations")
def my_registrations(request:Request):
    user=current_user(request)
    return [r for r in list_records("registrations") if r.get("user_id")==user["id"]]

@app.get("/api/me/certificates")
def my_certificates(request:Request):
    user=current_user(request)
    return [r for r in list_records("certificates") if r.get("user_id")==user["id"]]

@app.get("/api/announcements")
def announcements():
    return [r for r in list_records("announcements") if r.get("published",True)]

@app.get("/api/calendar")
def calendar():
    return list_records("events")

@app.get("/api/events")
def events(event_type:Optional[str]=None):
    items=[r for r in list_records("events") if r.get("published",True)]
    return items

@app.get("/api/events/{eid}")
def event_detail(eid:int):
    item=get_record("events",eid)
    if not item: raise HTTPException(404,"Event not found.")
    return item

@app.post("/api/events/{eid}/register")
def register_event(eid:int,data:dict,request:Request):
    user=current_user(request,required=False)
    ev=get_record("events",eid)
    if not ev: raise HTTPException(404,"Event not found.")
    rec={"event_id":eid,"user_id":user["id"] if user else None,"status":"registered",**data}
    return save_record("registrations",rec)

@app.post("/api/registrations/{rid}/cancel")
def cancel_registration(rid:int,request:Request):
    user=current_user(request)
    rec=get_record("registrations",rid)
    if not rec or rec.get("user_id")!=user["id"]: raise HTTPException(404,"Registration not found.")
    rec["status"]="cancelled"
    return save_record("registrations",rec,rid)

@app.get("/api/events/{eid}/participants")
def participants(eid:int,request:Request):
    current_user(request)
    return [r for r in list_records("registrations") if r.get("event_id")==eid]

@app.post("/api/events/{eid}/attendance/scan")
def attendance(eid:int,data:dict,request:Request):
    current_user(request)
    return {"message":"Attendance recorded.","event_id":eid,"code":data.get("code")}

@app.get("/api/events/{eid}/leaderboard")
def leaderboard(eid:int):
    ev=get_record("leaderboards",eid)
    return {"published":bool(ev and ev.get("published")),"entries":[r for r in list_records(f"leaderboard_{eid}")]}

@app.post("/api/events/{eid}/feedback")
def feedback(eid:int,data:dict,request:Request):
    user=current_user(request)
    return save_record("feedback",{"event_id":eid,"user_id":user["id"],**data})

@app.get("/api/team")
def team():
    return list_records("team")

@app.get("/api/galleries")
def galleries():
    return list_records("galleries")

@app.get("/api/galleries/{gid}")
def gallery(gid:int):
    item=get_record("galleries",gid)
    if not item: raise HTTPException(404,"Gallery not found.")
    item["images"]=list_records(f"gallery_images_{gid}")
    return item

@app.get("/api/resources")
def resources(request:Request):
    user=current_user(request,required=False)
    return [r for r in list_records("resources") if r.get("visibility","public")=="public" or (user and user["role"]=="admin") or user]

@app.get("/api/recruitment")
def recruitment():
    return [r for r in list_records("recruitment") if r.get("is_open",True)]

@app.post("/api/recruitment/{fid}/apply")
def apply_recruitment(fid:int,data:dict):
    return save_record(f"applications_{fid}",data)

@app.post("/api/contact")
def contact(data:dict):
    return {"message":"Your message has been received. Thank you!"} | save_record("contact",{"status":"new",**data})

@app.get("/api/content")
def content():
    return {r.get("key"):r.get("value") for r in list_records("content")}

# Admin-only generic CRUD routes for the website's content modules.
@app.api_route("/api/{path:path}", methods=["GET","POST","PUT","PATCH","DELETE"])
async def generic_api(path:str, request:Request):
    if path in ("auth/login","auth/signup","auth/forgot-password","auth/reset-password","me","admin/dashboard","admin/members"):
        raise HTTPException(404,"Endpoint not found.")
    method=request.method
    is_admin_path=path.startswith("admin/")
    user=current_user(request,required=is_admin_path or method in ("POST","PUT","PATCH","DELETE"))
    if is_admin_path and user["role"]!="admin": raise HTTPException(403,"Admin access required.")
    data={}
    content_type=request.headers.get("content-type","")
    if "application/json" in content_type:
        data=await request.json()
    elif "multipart/form-data" in content_type:
        form=await request.form()
        data={k:v for k,v in form.items() if not isinstance(v,UploadFile)}
        uploaded=[]
        for key,val in form.multi_items():
            if isinstance(val,UploadFile):
                ext=Path(val.filename or "upload.bin").suffix
                name=f"{secrets.token_hex(12)}{ext}"
                dest=UPLOADS/name
                dest.write_bytes(await val.read())
                uploaded.append({"field":key,"filename":val.filename,"url":f"/uploads/{name}"})
        if uploaded: data["files"]=uploaded
    parts=path.strip("/").split("/")
    # Admin CRUD for primary collections edits the same records shown publicly.
    if parts and parts[0] == "admin" and len(parts) <= 2 + (1 if len(parts) > 1 and parts[-1].isdigit() else 0):
        path = "/".join(parts[1:])
        parts = path.split("/")
    # infer collection and optional id
    bucket=path
    rid=None
    if len(parts)>=2 and parts[-1].isdigit():
        rid=int(parts[-1]); bucket="/".join(parts[:-1])
    if method=="GET":
        if rid:
            item=get_record(bucket,rid)
            if item is None: raise HTTPException(404,"Record not found.")
            return item
        if path=="admin/contact" and request.query_params.get("status"):
            return [r for r in list_records(bucket) if r.get("status")==request.query_params["status"]]
        return list_records(bucket)
    if method=="POST":
        return save_record(bucket,data)
    if method in ("PUT","PATCH"):
        if rid is None:
            # Treat PUT/PATCH on a collection as an upsert of a named content key.
            return save_record(bucket,data)
        old=get_record(bucket,rid) or {}
        old.update(data)
        return save_record(bucket,old,rid)
    if method=="DELETE":
        if rid is None: raise HTTPException(400,"An item ID is required.")
        return delete_record(bucket,rid)

