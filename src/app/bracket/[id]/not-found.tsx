import Link from 'next/link';
export default function NotFound() {
  return <main id="main-content" className="account-shell"><h1>Bracket unavailable</h1><p>This bracket may have been deleted, or you may not have access to it.</p><Link href="/account/brackets" className="auth-textButton">My brackets →</Link></main>;
}
