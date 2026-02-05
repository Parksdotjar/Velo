import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Nav() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession || null);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-section">
        <Link className="brand" href="/">
          <svg className="icon"><use href="/sprite.svg#icon-v"></use></svg>
          <span>CCAVE</span>
        </Link>
      </div>
      <div className="nav-section">
        <Link className="nav-button" href="/editing">Editing</Link>
        <Link className="nav-button" href="/thumbnails">Thumbnails</Link>
        <Link className="nav-button" href="/tutorials">Tutorials</Link>
        <Link className="nav-button" href="/upload">Upload</Link>
      </div>
      <div className="nav-section">
        {!session && (
          <>
            <Link className="nav-button" href="/login">Log in</Link>
            <Link className="nav-button" href="/signup">Sign up</Link>
          </>
        )}
        {session && (
          <>
            <Link className="icon-button" href="/profile" aria-label="Profile">
              <svg className="icon"><use href="/sprite.svg#icon-user"></use></svg>
            </Link>
            <Link className="icon-button" href="/settings" aria-label="Settings">
              <svg className="icon"><use href="/sprite.svg#icon-settings"></use></svg>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
