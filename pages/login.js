import { useState } from 'react';
import Layout from '../layout';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    window.location.href = '/editing';
  };

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Log in</h1>
          <p>Access your CCAVE account.</p>
        </div>
      </section>
      <section className="panel" style={{ padding: '18px' }}>
        <form className="form-section" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {message && <div className="footer-note">{message}</div>}
          <button className="button-primary accent-button" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </section>
    </Layout>
  );
}
