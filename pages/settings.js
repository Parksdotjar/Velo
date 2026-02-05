import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';

export default function Settings() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/';
  };

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Settings</h1>
          <p>Account settings are available for logged-in users.</p>
        </div>
      </section>
      {!session && <div className="footer-note">Log in to manage settings.</div>}
      {session && (
        <section className="panel" style={{ padding: '18px' }}>
          <div className="tag-row">
            <button className="button-secondary" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </section>
      )}
    </Layout>
  );
}
