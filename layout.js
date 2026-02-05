import Head from 'next/head';
import Nav from './nav';

export default function Layout({ title, children }) {
  return (
    <>
      <Head>
        <title>{title || 'CCAVE • Creator Coaster Asset Vault Enterprise'}</title>
      </Head>
      <Nav />
      <main className="page">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
