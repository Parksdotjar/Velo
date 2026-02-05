import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const IconV = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5h4l4 12h0l4-12h4l-6.5 16h-3z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);

const IconUser = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="none" stroke="white" strokeWidth="2"/>
    <path d="M4 20c1.6-4 14.4-4 16 0" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconSettings = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="2"/>
    <path d="M19 12l2-1-1-3-2 1a7 7 0 0 0-2-2l1-2-3-1-1 2a7 7 0 0 0-3 0l-1-2-3 1 1 2a7 7 0 0 0-2 2l-2-1-1 3 2 1a7 7 0 0 0 0 3l-2 1 1 3 2-1a7 7 0 0 0 2 2l-1 2 3 1 1-2a7 7 0 0 0 3 0l1 2 3-1-1-2a7 7 0 0 0 2-2l2 1 1-3-2-1a7 7 0 0 0 0-3z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

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
          <IconV />
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
              <IconUser />
            </Link>
            <Link className="icon-button" href="/settings" aria-label="Settings">
              <IconSettings />
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
