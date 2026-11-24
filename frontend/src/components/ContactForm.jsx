import React, {useState} from 'react';
import {api} from '../lib/api.js';
import {Notice} from '../lib/ui.jsx';

const EMPTY = {name: '', email: '', subject: '', message: ''};

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setError(false);
    try {
      const data = await api('/contact', {method: 'POST', body: values});
      setMsg(data.message);
      setValues(EMPTY);
    } catch (err) {
      setMsg(err.message); setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <label>Name<input required value={values.name} onChange={(e) => setValues({...values, name: e.target.value})}/></label>
      <label>Email<input type="email" required value={values.email} onChange={(e) => setValues({...values, email: e.target.value})}/></label>
      <label>Subject<input required value={values.subject} onChange={(e) => setValues({...values, subject: e.target.value})}/></label>
      <label>Message<textarea required rows="4" value={values.message} onChange={(e) => setValues({...values, message: e.target.value})}/></label>
      <button className="primary" disabled={busy}>{busy ? 'Sending...' : 'Send message'}</button>
      <Notice msg={msg} tone={error ? 'error' : undefined}/>
    </form>
  );
}
