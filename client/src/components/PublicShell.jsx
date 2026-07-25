import { Outlet } from 'react-router-dom';
import Footer from './Footer';

// Width constraint moved to individual pages — SubmitPage needs a wider
// two-column layout; LoginPage / NotFoundPage stay narrow (max-w-md).
export default function PublicShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
