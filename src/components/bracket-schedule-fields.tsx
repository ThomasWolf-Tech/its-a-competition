import type { Dispatch, SetStateAction } from 'react';
import { roundNames } from '@/lib/bracket';
import { formatDuration, type BracketSchedule, type BracketVisibility, type ScheduleDraft } from '@/lib/bracket-schedule';
import Icon from './icon';

export function ScheduleReview({ schedule, count }: { schedule: BracketSchedule; count: number }) {
  if (schedule.mode === 'manual') return <p className="builder-hint">Only you can end each round.</p>;
  const names = roundNames(count);
  return <><ol className="builder-scheduleReview" aria-label="Round durations">{schedule.roundEndsAt.map((end, i) => <li key={i}><span className="builder-roundNumber">{String(i + 1).padStart(2, '0')}</span><strong>{names[i]}</strong><span>{formatDuration(Date.parse(end) - Date.parse(i ? schedule.roundEndsAt[i - 1] : schedule.startsAt))}</span></li>)}</ol><p className="builder-hint">Estimated competition length: {formatDuration(Date.parse(schedule.roundEndsAt.at(-1)!) - Date.parse(schedule.startsAt))}. Each round gets its full duration when it opens.</p></>;
}
export default function BracketScheduleFields({ visibility, count, draft, setDraft, schedule, error }: {
  visibility: BracketVisibility; count: number; draft: ScheduleDraft; setDraft: Dispatch<SetStateAction<ScheduleDraft>>;
  previewStart: number; schedule: BracketSchedule | null; error?: string;
}) {
  const names = roundNames(count);
  function update(index: number, unit: number, value: number) {
    setDraft(old => {
      const current = old.roundMinutes?.[index] ?? 1440;
      const parts = [Math.floor(current / 1440), Math.floor(current % 1440 / 60), current % 60];
      parts[unit] = value;
      const total = parts[0] * 1440 + parts[1] * 60 + parts[2];
      return { ...old, roundMinutes: Array.from({ length: 5 }, (_, i) => !old.customize || i === index ? total : old.roundMinutes?.[i] ?? 1440) };
    });
  }
  return <section className="builder-section" aria-labelledby="timing-heading">
    <div className="builder-sectionTitle"><div><h2 id="timing-heading">Round timing</h2></div><Icon name="clock" /></div>
    <fieldset className="builder-choiceGroup"><legend className="builder-choiceLegend">How will rounds end?</legend><div className="builder-timingChoices">
      {(visibility === 'private' ? ['manual', 'per-round'] : ['per-round']).map(mode => <label className="builder-choice" key={mode}><input type="radio" name="timing-mode" checked={draft.mode === mode} onChange={() => setDraft(old => ({ ...old, mode: mode as ScheduleDraft['mode'] }))} /><Icon name={mode === 'manual' ? 'user' : 'clock'} /><span><strong>{mode === 'manual' ? 'Manual' : 'Timed'}</strong><small>{mode === 'manual' ? 'End each round yourself.' : 'Rounds end automatically.'}</small></span></label>)}
    </div></fieldset>
    {draft.mode === 'per-round' && <>
      <label className="builder-customizeRounds"><input type="checkbox" checked={!!draft.customize} onChange={e => { const customize = e.target.checked; setDraft(old => ({ ...old, customize, roundMinutes: customize ? old.roundMinutes : Array(5).fill(old.roundMinutes?.[0] ?? 1440) })); }} /><span>Customize each round</span></label>
      <div className="builder-roundFields">{(draft.customize ? names : ['Every round']).map((name, i) => {
        const total = draft.roundMinutes?.[i] ?? 1440;
        const parts = [Math.floor(total / 1440), Math.floor(total % 1440 / 60), total % 60];
        return <fieldset className="builder-roundField" key={i}><legend>{name}</legend><div className="builder-durationInputs">{(['Days', 'Hours', 'Minutes'] as const).map((unit, u) => <div className="builder-field" key={unit}><label htmlFor={`duration-${i}-${unit.toLowerCase()}`}>{unit}</label><select id={`duration-${i}-${unit.toLowerCase()}`} value={parts[u]} onChange={e => update(i, u, Number(e.target.value))} aria-invalid={total < 1} aria-describedby={total < 1 ? `duration-error-${i}` : undefined}>{Array.from({ length: [31,24,60][u] }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></div>)}</div>{total < 1 && <p id={`duration-error-${i}`} className="builder-error">Give this round at least one minute.</p>}</fieldset>;
      })}</div>
    </>}
    {error && <p id="schedule-error" className="builder-error" role="alert">{error}</p>}
    {schedule && <div className="builder-schedulePreview"><h3>{schedule.mode === 'manual' ? 'Manual rounds' : 'Round durations'}</h3><ScheduleReview schedule={schedule} count={count} /></div>}
    {visibility === 'public' && <p className="builder-lockNote"><Icon name="lock" /> Once submitted, round durations are locked. Public rounds cannot be ended early or reset.</p>}
  </section>;
}
