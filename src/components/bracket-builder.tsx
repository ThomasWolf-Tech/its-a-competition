"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import Icon from "./icon";
import { TITLE_MIN, TITLE_LIMIT, COMPETITOR_LIMIT, DESCRIPTION_LIMIT, DRAFT_KEY, configErrors, type BracketConfig } from "@/lib/bracket-config";
import { BRACKET_CATEGORIES, categoryName, type BracketCategory } from "@/lib/bracket-categories";
import { bracketSize, roundNames } from "@/lib/bracket";
import { TROPHIES, TROPHY_CATEGORIES, getTrophy } from "@/lib/trophies";
import { useBracketConfig } from "@/lib/use-bracket-config";
import { createSchedule, durationTiming, localDateTime, type BracketVisibility, type BracketSchedule, type ScheduleDraft } from "@/lib/bracket-schedule";
import BracketScheduleFields from "./bracket-schedule-fields";
import { saveDraft, submitForReview } from "@/app/create/actions";
import { storedTiming, editorTiming, type SavedDraft } from "@/lib/bracket-draft";
import { bracketContentError, contentError } from "@/lib/content-policy";
import "./bracket-builder.css";

export default function BracketBuilder({ draft, importPreview = false }: { draft: SavedDraft | null; importPreview?: boolean }) {
  const { hydrated, config } = useBracketConfig();
  if (!hydrated) return <div className="builder-shell" role="status">Getting the arena ready…</div>;
  return <BuilderForm initial={importPreview ? config : null} draft={draft} />;
}
function BuilderForm({ initial, draft }: { initial: BracketConfig | null; draft: SavedDraft | null }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(draft?.title ?? initial?.title ?? "");
  const [description, setDescription] = useState(draft?.description ?? initial?.description ?? "");
  const [bracketCategory, setBracketCategory] = useState<BracketCategory>(draft?.category ?? initial?.category ?? "everything-else");
  const [count, setCount] = useState(draft?.names.length ?? initial?.names.length ?? 16);
  const [names, setNames] = useState<string[]>(() => Array.from({ length: 32 }, (_, index) => draft?.names[index] ?? initial?.names[index] ?? ""));
  const [trophyId, setTrophyId] = useState(draft?.trophyId ?? initial?.trophyId ?? "crown");
  const [category, setCategory] = useState<string>(getTrophy(trophyId).category);
  const [submitted, setSubmitted] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [visibility, setVisibility] = useState<BracketVisibility | "">(draft?.visibility ?? initial?.visibility ?? "");
  const [previewStart] = useState(() => Math.ceil(Date.now() / 60_000) * 60_000);
  const [timing, setTiming] = useState<ScheduleDraft>(() => durationTiming((draft ? editorTiming(draft.timing) : null) ?? ({
    mode: initial?.schedule?.mode ?? "",
    endDate: initial?.schedule && initial.schedule.mode !== "manual" ? localDateTime(initial.schedule.roundEndsAt.at(-1)!) : "",
    roundEndsAt: initial?.schedule && initial.schedule.mode !== "manual" ? [...initial.schedule.roundEndsAt] : [],
    roundMinutes: initial?.schedule && initial.schedule.mode !== "manual" ? initial.schedule.roundMinutes : undefined,
  }), previewStart));
  const [timingError, setTimingError] = useState("");
  const identity = useRef({ id: draft?.id ?? "", revision: draft?.revision ?? 0 });
  const saveInFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState(draft?.id ?? "");
  const [conflict, setConflict] = useState(false);
  async function persistDraft() {
    if (saveInFlight.current || conflict) return;
    const contentMessage = bracketContentError(title, description, names.slice(0, count));
    if (contentMessage) {
      setSaveError(contentMessage); setSavedMessage("");
      const field = contentError(title, "title", "Bracket name") ? "#bracket-name" : contentError(description, "description", "Description") ? "#bracket-description" : `#competitor-${names.slice(0, count).findIndex((name, i) => contentError(name, "competitor", `Competitor ${i + 1}`))}`;
      form.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(field)?.focus();
      return;
    }
    saveInFlight.current = true; setSaving(true); setSaveError(""); setSavedMessage("");
    if (!identity.current.id) identity.current.id = crypto.randomUUID();
    try {
      const result = await saveDraft({ ...identity.current, title, description, category: bracketCategory, trophyId, visibility, names: names.slice(0, count), timing: storedTiming(timing) });
      if ("error" in result) { setSaveError(result.error); setConflict(Boolean(result.conflict)); if (result.conflict) setSavedId(identity.current.id); }
      else {
        identity.current = result; setSavedId(result.id);
        setSavedFingerprint(fingerprint);
        setSavedMessage("Draft saved. Only you can see it; voting hasn’t started.");
        // Keep a durable bookmark without remounting the editor or discarding later input.
        window.history.replaceState(null, "", `/create?draft=${result.id}`);
        return result;
      }
    } catch { setSaveError("We couldn’t connect. Your changes are still here; try saving again."); }
    finally { saveInFlight.current = false; setSaving(false); }
  }

  async function submitCompetition() {
    setSubmitted(true); setSaveError(""); setTimingError("");
    if (!visibility || Object.keys(configErrors(config)).length) return;
    // Submission is an event handler; validate against the current instant.
    // eslint-disable-next-line react-hooks/purity
    const submissionNow = Date.now();
    try { createSchedule(visibility, timing, count, submissionNow); }
    catch (error) { setTimingError(error instanceof Error ? error.message : "Check your round schedule."); return; }
    const saved = await persistDraft();
    if (!saved) return;
    saveInFlight.current = true; setSaving(true);
    try {
      const result = await submitForReview(saved.id, saved.revision);
      if (result.error) setSaveError(result.error);
      else router.push(`/bracket/${saved.id}`);
    } catch { setSaveError("We couldn’t connect. Your draft is saved; please try again."); }
    finally { saveInFlight.current = false; setSaving(false); }
  }

  const config = { title, description, category: bracketCategory, names: names.slice(0, count), trophyId };
  const fingerprint = JSON.stringify({ ...config, visibility, timing });
  const errors = configErrors(config);
  const titleError = (submitted && errors.title) || (saveError.startsWith("Bracket name:") ? saveError : "");
  const descriptionError = (submitted && errors.description) || (saveError.startsWith("Description:") ? saveError : "");
  const namesError = saveError.startsWith("Competitor ") ? saveError : submitted ? errors.names : "";
  let schedule: BracketSchedule | null = null;
  try { schedule = createSchedule(visibility, timing, count, previewStart); } catch { /* Incomplete timing fields are validated on submit. */ }
  const trophy = getTrophy(trophyId);
  const filled = config.names.filter(name => name.trim()).length;
  const byes = bracketSize(count) - count;
  const submit = (event: FormEvent) => {
    event.preventDefault(); setSubmitted(true); setStorageError(""); setTimingError("");
    // This is an event handler; schedules start at submission, not render time.
    // eslint-disable-next-line react-hooks/purity
    const submittedAt = Date.now();
    let finalSchedule: BracketSchedule | null = null;
    let scheduleMessage = "";
    try { finalSchedule = createSchedule(visibility, timing, count, submittedAt); } catch (error) { scheduleMessage = error instanceof Error ? error.message : "Check your round schedule."; setTimingError(scheduleMessage); }
    if (Object.keys(errors).length || scheduleMessage || !visibility) {
      if (!visibility) form.current?.querySelector<HTMLInputElement>("input[name=visibility]")?.focus();
      else if (errors.title) form.current?.querySelector<HTMLInputElement>("#bracket-name")?.focus();
      else if (errors.description) form.current?.querySelector<HTMLTextAreaElement>("#bracket-description")?.focus();
      else if (errors.category) form.current?.querySelector<HTMLSelectElement>("#bracket-category")?.focus();
      else if (scheduleMessage) form.current?.querySelector<HTMLInputElement>(timing.mode === "end-date" ? "#bracket-end" : timing.mode === "per-round" ? "#duration-0-minutes" : "input[name=timing-mode]")?.focus();
      else {
        const seen = new Set<string>();
        const invalid = config.names.findIndex((name, index) => { const key = name.trim().toLocaleLowerCase(); const duplicate = seen.has(key); seen.add(key); return !key || duplicate || Boolean(contentError(name, "competitor", `Competitor ${index + 1}`)); });
        form.current?.querySelector<HTMLInputElement>(`#competitor-${Math.max(0, invalid)}`)?.focus();
      }
      return;
    }
    try {
      const sameSetup = initial && JSON.stringify(initial.names) === JSON.stringify(config.names.map(name => name.trim())) && initial.visibility === visibility && JSON.stringify(initial.schedule) === JSON.stringify(finalSchedule);
      const previewId = sameSetup ? initial.previewId ?? crypto.randomUUID() : crypto.randomUUID();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...config, title: title.trim(), description: description.trim(), names: config.names.map(name => name.trim()), visibility, schedule: finalSchedule, previewId }));
      window.dispatchEvent(new Event("bracket-draft"));
      router.push("/bracket/custom");
    } catch { setStorageError("Your browser couldn’t save this preview. Allow site storage, then try again."); }
  }
  return <div className="builder-shell">
    <Link href="/account/brackets" className="builder-back" prefetch={false}>← My saved brackets</Link>
    <header className="builder-heading"><span className="section-kicker">A LITTLE RIVALRY STARTS HERE</span><h1>Set the stage.<br /><span>Make it a competition.</span></h1><p>Bring the contenders. Pick the prize. Let the best win.</p></header>
    <form ref={form} onSubmit={submit} noValidate className="builder-layout">
      <div className="builder-sections">
        <section className="builder-section" aria-labelledby="visibility-heading">
          <div className="builder-sectionTitle"><span>01</span><div><h2 id="visibility-heading">Who’s in on the rivalry?</h2><p>Choose who your bracket is for before setting the stage.</p></div><Icon name="globe" /></div>
          <fieldset className="builder-choiceGroup"><legend className="builder-choiceLegend">Bracket visibility <span>Required</span></legend><div className="builder-visibilityChoices">
            {([{ id: "private", title: "Keep it private", description: "Make your own picks or bring a few rivals. You choose who’s invited.", icon: "lock" }, { id: "public", title: "Open it to everyone", description: "Let the crowd settle it. Anyone can discover your bracket and join the vote.", icon: "globe" }] as const).map(choice => <label className="builder-choice" key={choice.id}><input type="radio" name="visibility" required value={choice.id} checked={visibility === choice.id} onChange={() => { setVisibility(choice.id); setTiming(previous => ({ ...previous, mode: choice.id === "public" ? "per-round" : "manual" })); setTimingError(""); }} /><Icon name={choice.icon} /><span><strong>{choice.title}</strong><small>{choice.description}</small></span><span className="builder-choiceCheck" aria-hidden="true">{visibility === choice.id ? "✓" : ""}</span></label>)}
          </div></fieldset>
          {visibility === "private" && <p className="builder-visibilityNote"><Icon name="lock" /> Yours to play solo or share by invitation. Private brackets stay out of public discovery. You can play solo as soon as your bracket goes live.</p>}
          {visibility === "public" && <p className="builder-visibilityNote"><Icon name="clock" /> Choose a duration for each round. Once submitted, the setup is locked and rounds end automatically.</p>}
        </section>
        {visibility && <>
        <section className="builder-section" aria-labelledby="basics-heading">
          <div className="builder-sectionTitle"><span>02</span><div><h2 id="basics-heading">Name the showdown</h2><p>Every good rivalry needs a title.</p></div><Icon name="bracket" /></div>
          <div className="builder-field"><label htmlFor="bracket-name">Bracket name <span>Required</span></label><input id="bracket-name" required placeholder="The ultimate snack showdown" minLength={TITLE_MIN} maxLength={TITLE_LIMIT} value={title} onChange={event => { setTitle(event.target.value); if (!conflict) setSaveError(""); }} aria-invalid={Boolean(titleError)} aria-describedby="title-hint title-count title-error" /><div className="builder-fieldFoot"><span>{titleError ? <span id="title-error" className="builder-error">{titleError}</span> : <span id="title-hint">{TITLE_MIN}–{TITLE_LIMIT} characters. This is your bracket’s headline.</span>}</span><span id="title-count">{title.length}/{TITLE_LIMIT}</span></div></div>
          <div className="builder-field builder-descriptionField"><label htmlFor="bracket-description">Short description <span>Optional</span></label><textarea id="bracket-description" rows={3} maxLength={DESCRIPTION_LIMIT} value={description} onChange={event => { setDescription(event.target.value); if (!conflict) setSaveError(""); }} placeholder="The snack debate has gone on long enough. Bring your strongest opinions." aria-invalid={Boolean(descriptionError)} aria-describedby="description-hint description-count description-error" /><div className="builder-fieldFoot"><span id="description-hint">Set the scene, stir the debate, have fun with it. This appears on your featured bracket.</span><span id="description-count">{description.length}/{DESCRIPTION_LIMIT}</span></div>{descriptionError && <p id="description-error" className="builder-error">{descriptionError}</p>}</div>
          <div className="builder-field builder-categoryField"><label htmlFor="bracket-category">Bracket category</label><select id="bracket-category" value={bracketCategory} onChange={event => setBracketCategory(event.target.value as BracketCategory)} aria-invalid={submitted && Boolean(errors.category)} aria-describedby="category-hint"><option disabled value="">Choose a category</option>{BRACKET_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p id="category-hint" className="builder-hint">Find your crowd. Can’t pin it down? Everything Else has you covered.</p></div>
          <div className="builder-countRow"><div className="builder-field"><label htmlFor="competitor-count">Number of competitors</label><select id="competitor-count" value={count} onChange={event => setCount(Number(event.target.value))}>{Array.from({ length: 31 }, (_, index) => index + 2).map(number => <option key={number} value={number}>{number} competitors</option>)}</select></div><p>{roundNames(count).length} rounds · Single elimination<br /><span>{byes ? `${byes} automatic first-round ${byes === 1 ? "bye" : "byes"}.` : "An even field. No byes needed."}</span></p></div>
        </section>
        <BracketScheduleFields visibility={visibility} count={count} draft={timing} setDraft={value => { setTiming(value); setTimingError(""); }} previewStart={previewStart} schedule={schedule} error={timingError} />
        <section className="builder-section" aria-labelledby="competitors-heading">
          <div className="builder-sectionTitle"><span>04</span><div><h2 id="competitors-heading">Meet the contenders</h2><p>Movies, snacks, teams. Everything’s game.</p></div><span className="builder-progress">{filled}/{count}</span></div>
          <p className="builder-hint">Entry order sets the seeds. Top seeds receive any byes. Names can be up to {COMPETITOR_LIMIT} characters; initials become their thumbnails.</p>
          <p className="builder-hint">Keep slurs out of bracket names, descriptions, and competitor names.</p>
          <div id="names-error" className="builder-error" role="status">{namesError}</div>
          <div className="builder-competitorGrid">{config.names.map((name, index) => {
            const duplicate = Boolean(name.trim()) && config.names.some((other, otherIndex) => index !== otherIndex && other.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
            const invalid = (submitted && (!name.trim() || duplicate || Boolean(contentError(name, "competitor", `Competitor ${index + 1}`)))) || Boolean(namesError?.startsWith(`Competitor ${index + 1}:`));
            return <div key={index} className="builder-competitorField"><label htmlFor={`competitor-${index}`}><span className="builder-seed">{String(index + 1).padStart(2, "0")}</span><span>Competitor {index + 1}</span></label><input id={`competitor-${index}`} required placeholder={`Name competitor ${index + 1}`} maxLength={COMPETITOR_LIMIT} value={name} aria-invalid={invalid} aria-describedby={`count-${index}${invalid ? " names-error" : ""}`} onChange={event => { setNames(previous => previous.map((value, nameIndex) => nameIndex === index ? event.target.value : value)); if (!conflict) setSaveError(""); }} /><span id={`count-${index}`} className="builder-counter">{name.length}/{COMPETITOR_LIMIT}</span></div>;
          })}</div>
        </section>
        <section className="builder-section" aria-labelledby="trophy-heading">
          <div className="builder-sectionTitle"><span>05</span><div><h2 id="trophy-heading">Choose what’s at stake</h2><p>Find a prize worthy of the rivalry.</p></div><Icon name="trophy" /></div>
          <div className="builder-categories" role="group" aria-label="Trophy categories">{TROPHY_CATEGORIES.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}<span>5</span></button>)}</div>
          <div className="builder-trophyGrid" role="group" aria-label={`${category} trophies`}>{TROPHIES.filter(item => item.category === category).map(item => <button key={item.id} type="button" className="builder-trophyChoice" aria-pressed={trophyId === item.id} onClick={() => setTrophyId(item.id)}><span className="builder-check" aria-hidden="true">{trophyId === item.id ? "✓" : ""}</span><Image src={item.src} alt="" width={168} height={168} /><span className="builder-trophyLabel"><strong>{item.name}</strong><small>{item.subjectLabel}</small></span></button>)}</div>
          <p className="builder-hint">Twenty virtual prizes. Your pick takes center stage.</p>
        </section>
        </>}
      </div>
      <aside className="builder-summary" aria-label="Bracket setup summary">
        <div className="builder-summaryTop"><Icon name="spark" /><span>THE STAGE IS YOURS</span></div>
        <div className="builder-miniBracket" aria-hidden="true"><span /><span /><span /><span /></div>
        <Image className="builder-summaryTrophy" src={trophy.src} alt="" width={176} height={176} />
        <p className="builder-prize" aria-live="polite">{trophy.name}</p>
        <h2>{title.trim() || "Your next great rivalry"}</h2>
        {visibility && <div className="builder-summaryAccess"><Icon name={visibility === "private" ? "lock" : "globe"} /><span>{visibility === "private" ? "Private bracket" : "Public bracket"} · {timing.mode === "manual" ? "Manual rounds" : "Scheduled rounds"}</span></div>}
        <span className="builder-summaryCategory">{categoryName(bracketCategory)}</span>
        {description.trim() && <p className="builder-summaryDescription">{description.trim()}</p>}
        <div className="builder-summaryStats"><div><strong>{count}</strong><span>competitors</span></div><div><strong>{roundNames(count).length}</strong><span>rounds</span></div><div><strong>1</strong><span>winner</span></div></div>
        <div className="builder-readiness"><Icon name={!visibility ? "globe" : filled === count ? "check" : "user"} /><span>{!visibility ? "Choose private or public to get started." : filled === count ? "Contenders ready. Bring it on." : `${count - filled} contenders still need a name.`}</span></div>
        <button className="builder-submit" type="button" disabled={saving || conflict} onClick={submitCompetition}>{saving ? "Working…" : "Submit bracket"} <Icon name="check" /></button>
        <button className="reset-button" type="button" disabled={saving || conflict} onClick={persistDraft}>Save draft for later</button>
        {savedMessage && savedFingerprint === fingerprint && <p className="builder-saveMessage" role="status">{savedMessage}</p>}
        {savedMessage && savedFingerprint !== fingerprint && <p className="builder-localNote" role="status">You have changes that haven’t been saved.</p>}
        {saveError && <p className="builder-error" role="alert">{saveError}</p>}
        {conflict && <a className="builder-back" href={`/create?draft=${savedId}`}>Reload saved draft →</a>}
        <button className="reset-button" type="submit" disabled={!visibility || saving}>Preview bracket <Icon name="arrow" /></button>
        {submitted && (Object.keys(errors).length > 0 || timingError) && <p className="builder-error" role="alert">Check the highlighted fields to finish your bracket.</p>}
        {storageError && <p className="builder-error" role="alert">{storageError}</p>}
        <p className="builder-localNote">Submitted brackets go live automatically after review.<br />Save an unfinished draft for later, or try a local preview.</p>
      </aside>
    </form>
  </div>;
}
