import Link from 'next/link';
import Layout from '../layout';

export default function Home() {
  return (
    <Layout title="CCAVE • Creator Coaster Asset Vault Enterprise">
      <section className="hero">
        <div>
          <h1>CCAVE</h1>
          <p>Upload. Search. Download. Create.</p>
          <div className="footer-note">Creator Coaster Asset Vault Enterprise</div>
        </div>
        <div className="tag-row">
          <Link className="button-primary accent-button" href="/editing">
            Browse Assets
          </Link>
          <Link className="button-secondary" href="/upload">
            Upload
          </Link>
        </div>
      </section>
    </Layout>
  );
}
