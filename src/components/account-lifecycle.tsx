'use client';
import { useActionState, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { changeAccountStatus, deleteDraftBracket, removeSavedBracket } from '@/app/account/actions';

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
  return <form action={action} className="saved-bracket-remove"><input type="hidden" name="id" value={id} /><button type="submit" className="bracket-list-button bracket-list-button-muted" disabled={pending}>{pending ? 'Removing…' : 'Remove from saved'}</button>{state.error && <p className="auth-error" role="alert">{state.error}</p>}</form>;
}

export function DraftBracketActions({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteDraftBracket, { error: '' });
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  return <>
    <div className="bracket-list-actions">
      <Link href={`/create?draft=${id}`} prefetch={false} className="bracket-list-button">Edit draft</Link>
      <button ref={trigger} type="button" className="bracket-list-button bracket-list-button-muted" aria-expanded={confirming} aria-controls={confirming ? panelId : undefined} disabled={pending} onClick={() => setConfirming(!confirming)}>Delete draft</button>
    </div>
    {confirming && <form id={panelId} action={action} className="draft-delete-panel" aria-labelledby={`${panelId}-title`}>
      <input type="hidden" name="id" value={id} />
      <h3 id={`${panelId}-title`}>Delete this draft?</h3>
      <p id={`${panelId}-description`}>“{title || 'Untitled bracket'}” and its setup will be permanently removed.</p>
      <label className="draft-delete-confirm"><input type="checkbox" name="confirm" value="yes" required disabled={pending} aria-describedby={`${panelId}-description`} />I understand this cannot be undone.</label>
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <div className="draft-delete-actions">
        <button type="button" className="bracket-list-button bracket-list-button-muted" disabled={pending} onClick={() => { setConfirming(false); trigger.current?.focus(); }}>Cancel</button>
        <button type="submit" className="primary-button" disabled={pending}>{pending ? 'Deleting…' : 'Delete draft'}</button>
      </div>
    </form>}
  </>;
}
