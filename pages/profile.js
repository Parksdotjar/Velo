import { useEffect, useState } from 'react';
import Layout from '../layout';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      return data.session;
    }).then(async (sessionData) => {
      if (!sessionData) return;
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('username,display_name')
        .eq('id', sessionData.user.id)
        .single();
      setProfile(profileRow || null);
    });
  }, []);

  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>Profile</h1>
          <p>Your account profile.</p>
        </div>
      </section>
      {!session && <div className="footer-note">Log in to view your profile.</div>}
      {session && (
        <section className="panel" style={{ padding: '18px' }}>
          <div><strong>{profile?.display_name || 'Creator'}</strong></div>
          <div className="footer-note">@{profile?.username || 'unknown'}</div>
        </section>
      )}
    </Layout>
  );
}
