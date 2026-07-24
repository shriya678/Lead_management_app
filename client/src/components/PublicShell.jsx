import { Outlet } from 'react-router-dom';
import Footer from './Footer';

export default function PublicShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
