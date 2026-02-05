import '../styles.css';
import { ToastProvider } from '../toastProvider';

export default function App({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}
