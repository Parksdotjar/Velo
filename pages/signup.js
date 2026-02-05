import { useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);
    const cleanUsername = username.trim().replace('@', '').toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim(), username: cleanUsername },
        emailRedirectTo: `${window.location.origin}/login`
      }
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      window.location.href = '/editing';
      return;
    }
    setMessage('Check your email to confirm your account, then log in.');
    setLoading(false);
  };

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Sign up</h1>
          <p>Create your CCAVE account.</p>
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
          <div className="form-group">
            <label>Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          {message && <div className="footer-note">{message}</div>}
          <button className="button-primary accent-button" type="submit" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
      </section>
    </Layout>
  );
}
