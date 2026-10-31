'use client';
import { useActionState } from 'react';
import { changeAccountStatus, removeSavedBracket } from '@/app/account/actions';

export default function AccountLifecycle() {
  const [state, action, pending] = useActionState(changeAccountStatus, { error: '' });
  return <form action={action} className="auth-fields">
    <p>Deleting your account permanently removes your sign-in, profile, saved list, trophy room, drafts, pending submissions, and all private brackets. This cannot be undone.</p>
    <p>Your public live and completed brackets stay available with Anonymous as their creator. Live rounds continue on their timers. Votes already cast remain anonymous until the round ends.</p>
    <label className="account-retention-confirm"><input type="checkbox" name="confirm" value="yes" required disabled={pending} />I understand that my account and all private brackets will be permanently deleted.</label>
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}
    <button type="submit" className="primary-button" disabled={pending}>{pending ? 'Deleting…' : 'Permanently delete account'}</button>
  </form>;
}
export function SavedBracketRemove({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeSavedBracket, { error: '' });
  return <form action={action}><input type="hidden" name="id" value={id} /><button type="submit" className="auth-textButton" disabled={pending}>{pending ? 'Removing…' : 'Remove from saved'}</button>{state.error && <p className="auth-error" role="alert">{state.error}</p>}</form>;
}
