import { redirect } from 'next/navigation';
import Link from 'next/link';

import { SignInForm } from '@/components/sign-in-form';
import { getServerAuthSession } from '@/lib/auth';

export default async function LoginPage() {
  const session = await getServerAuthSession();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (session?.user?.email && session.user.allowed) {
    redirect('/calendar');
  }

  return (
    <main className="public-shell min-h-screen">
      <div className="relative z-10 mx-auto w-full max-w-[78rem] px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between border-b border-black/10 pb-4">
          <div>
            <Link href="/" className="text-sm font-semibold tracking-[-0.02em]">
              The Grow Room
            </Link>
            <p className="mt-0.5 hidden text-[11px] tracking-[0.04em] text-black/45 sm:block">
              Friends-only guest room
            </p>
          </div>
          <div className="text-sm text-black/70">
            <Link href="/request-invite" className="hover:text-black">
              Request an invite →
            </Link>
          </div>
        </div>
        <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center py-12">
          <SignInForm showGoogle={googleEnabled} />
        </div>
      </div>
    </main>
  );
}
