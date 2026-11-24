import React, {useState} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {api} from '../lib/api.js';
import {useAuth} from '../lib/auth.jsx';
import {useT} from '../lib/i18n.jsx';
import {Notice} from '../lib/ui.jsx';

const DOMAIN = '@chitkara.edu.in';

function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must include at least one letter and one number.';
  return '';
}

export function LoginPage() {
  const {t} = useT();
  const {login} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({email: '', password: ''});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setBusy(true);
    try {
      const data = await api('/auth/login', {method: 'POST', body: {email: values.email.trim(), password: values.password}});
      login(data.access_token, data.user);
      navigate(location.state?.from || '/dashboard', {replace: true});
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section page narrow">
      <div className="eyebrow">MEMBER ACCESS</div>
      <h2>{t('welcomeBack')}</h2>
      <form className="panel form" onSubmit={submit}>
        <label>{t('email')}<input type="email" required placeholder={`name${DOMAIN}`} value={values.email} onChange={(e) => setValues({...values, email: e.target.value})}/></label>
        <label>{t('password')}<input type="password" required value={values.password} onChange={(e) => setValues({...values, password: e.target.value})}/></label>
        <button className="primary full" disabled={busy}>{busy ? 'Logging in...' : t('login')}</button>
        <Notice msg={msg} tone="error"/>
        <div className="auth-links">
          <Link to="/forgot-password">{t('forgotPassword')}</Link>
          <Link to="/register">New student? {t('register')}</Link>
        </div>
      </form>
    </section>
  );
}

const EMPTY = {name: '', email: '', password: '', phone: '', student_id: '', course: '', branch: '', semester: ''};

export function RegisterPage() {
  const {t} = useT();
  const [values, setValues] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError(false);
    const pwError = validatePassword(values.password);
    if (pwError) { setMsg(pwError); setError(true); return; }
    if (!values.email.toLowerCase().endsWith(DOMAIN)) { setMsg(`Use your college email ending in ${DOMAIN}`); setError(true); return; }
    setBusy(true);
    try {
      const body = {...values, phone: values.phone.replace(/[\s-]/g, '')};
      await api('/auth/signup', {method: 'POST', body});
      setMsg('Account created. You can log in once the Admin approves your membership. We have emailed you the details.');
      setValues(EMPTY);
    } catch (err) {
      setMsg(err.message); setError(true);
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (e) => setValues({...values, [key]: e.target.value});
  return (
    <section className="section page narrow">
      <div className="eyebrow">STUDENT REGISTRATION</div>
      <h2>{t('joinCommunity')}</h2>
      <form className="panel form" onSubmit={submit}>
        <label>{t('name')}<input required minLength="2" value={values.name} onChange={set('name')}/></label>
        <label>College email<input type="email" required placeholder={`name${DOMAIN}`} value={values.email} onChange={set('email')}/></label>
        <label>{t('password')} (min 8, letters and numbers)<input type="password" required minLength="8" value={values.password} onChange={set('password')}/></label>
        <label>{t('phone')}<input required placeholder="+91 98765 43210" value={values.phone} onChange={set('phone')}/></label>
        <label>Registration / student ID<input required value={values.student_id} onChange={set('student_id')}/></label>
        <div className="row2">
          <label>Course<input required placeholder="B.Tech" value={values.course} onChange={set('course')}/></label>
          <label>Branch<input required placeholder="CSE" value={values.branch} onChange={set('branch')}/></label>
        </div>
        <label>Semester<input required placeholder="e.g. 5" value={values.semester} onChange={set('semester')}/></label>
        <p className="muted">You can add a profile photograph from your dashboard after your account is approved.</p>
        <button className="primary full" disabled={busy}>{busy ? 'Submitting...' : t('register')}</button>
        <Notice msg={msg} tone={error ? 'error' : undefined}/>
        <div className="auth-links"><Link to="/login">Already registered? {t('login')}</Link></div>
      </form>
    </section>
  );
}

export function ForgotPasswordPage() {
  const {t} = useT();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [devNote, setDevNote] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setDevNote(''); setError(false); setBusy(true);
    try {
      const data = await api('/auth/forgot-password', {method: 'POST', body: {email: email.trim()}});
      setMsg(data.message);
      setDevNote(data.dev_note || '');
    } catch (err) {
      setMsg(err.message); setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section page narrow">
      <div className="eyebrow">ACCOUNT</div>
      <h2>{t('forgotPassword')}</h2>
      <form className="panel form" onSubmit={submit}>
        <label>{t('email')}<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></label>
        <button className="primary full" disabled={busy}>Send reset link</button>
        <Notice msg={msg} tone={error ? 'error' : undefined}/>
        {devNote && <p className="notice dev">Development mode: {devNote}</p>}
        <div className="auth-links"><Link to="/login">{t('login')}</Link></div>
      </form>
    </section>
  );
}

export function ResetPasswordPage() {
  const {t} = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const token = params.get('token') || '';

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError(false);
    const pwError = validatePassword(password);
    if (pwError) { setMsg(pwError); setError(true); return; }
    if (password !== confirm) { setMsg('The two passwords do not match.'); setError(true); return; }
    setBusy(true);
    try {
      const data = await api('/auth/reset-password', {method: 'POST', body: {token, password}});
      setMsg(data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMsg(err.message); setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section page narrow">
      <div className="eyebrow">ACCOUNT</div>
      <h2>{t('resetPassword')}</h2>
      {!token ? <p className="notice">This page needs a reset link from your email.</p> : (
        <form className="panel form" onSubmit={submit}>
          <label>New password<input type="password" required minLength="8" value={password} onChange={(e) => setPassword(e.target.value)}/></label>
          <label>Confirm new password<input type="password" required minLength="8" value={confirm} onChange={(e) => setConfirm(e.target.value)}/></label>
          <button className="primary full" disabled={busy}>Set new password</button>
          <Notice msg={msg} tone={error ? 'error' : undefined}/>
        </form>
      )}
    </section>
  );
}
