"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import Icon from "./icon";
import { TITLE_LIMIT, COMPETITOR_LIMIT, DRAFT_KEY, configErrors, type BracketConfig } from "@/lib/bracket-config";
import { bracketSize, roundNames } from "@/lib/bracket";
import { TROPHIES, TROPHY_CATEGORIES, getTrophy } from "@/lib/trophies";
import { useBracketConfig } from "@/lib/use-bracket-config";
import "./bracket-builder.css";

export default function BracketBuilder() {
  const { hydrated, config } = useBracketConfig();
  if (!hydrated) return <div className="builder-shell" role="status">Getting the arena ready…</div>;
  return <BuilderForm initial={config} />;
}
function BuilderForm({ initial }: { initial: BracketConfig | null }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [count, setCount] = useState(initial?.names.length ?? 16);
  const [names, setNames] = useState<string[]>(() => Array.from({ length: 32 }, (_, index) => initial?.names[index] ?? ""));
  const [trophyId, setTrophyId] = useState(initial?.trophyId ?? "crown");
  const [category, setCategory] = useState<string>(getTrophy(trophyId).category);
  const [submitted, setSubmitted] = useState(false);
  const [storageError, setStorageError] = useState("");
  const config = { title, names: names.slice(0, count), trophyId };
  const errors = configErrors(config);
  const trophy = getTrophy(trophyId);
  const filled = config.names.filter(name => name.trim()).length;
  const byes = bracketSize(count) - count;
  function submit(event: FormEvent) {
    event.preventDefault(); setSubmitted(true); setStorageError("");
    if (Object.keys(errors).length) {
      if (errors.title) form.current?.querySelector<HTMLInputElement>("#bracket-name")?.focus();
      else {
        const seen = new Set<string>();
        const invalid = config.names.findIndex(name => { const key = name.trim().toLocaleLowerCase(); const duplicate = seen.has(key); seen.add(key); return !key || duplicate; });
        form.current?.querySelector<HTMLInputElement>(`#competitor-${Math.max(0, invalid)}`)?.focus();
      }
      return;
    }
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title: title.trim(), names: config.names.map(name => name.trim()), trophyId }));
      window.dispatchEvent(new Event("bracket-draft"));
      router.push("/bracket/custom");
    } catch { setStorageError("Your browser couldn’t save this preview. Allow site storage, then try again."); }
  }
  return <div className="builder-shell">
    <Link href="/" className="builder-back">← Back to the good stuff</Link>
    <header className="builder-heading"><span className="section-kicker">A LITTLE RIVALRY STARTS HERE</span><h1>Set the stage.<br /><span>Make it a competition.</span></h1><p>Bring the contenders. Pick the prize. Let the best win.</p></header>
    <form ref={form} onSubmit={submit} noValidate className="builder-layout">
      <div className="builder-sections">
        <section className="builder-section" aria-labelledby="basics-heading">
          <div className="builder-sectionTitle"><span>01</span><div><h2 id="basics-heading">Name the showdown</h2><p>Every good rivalry needs a title.</p></div><Icon name="bracket" /></div>
          <div className="builder-field"><label htmlFor="bracket-name">Bracket name <span>Required</span></label><input id="bracket-name" required placeholder="The ultimate snack showdown" maxLength={TITLE_LIMIT} value={title} onChange={event => setTitle(event.target.value)} aria-invalid={submitted && Boolean(errors.title)} aria-describedby="title-count title-error" /><div className="builder-fieldFoot"><span id="title-error" className="builder-error">{submitted && errors.title}</span><span id="title-count">{title.length}/{TITLE_LIMIT}</span></div></div>
          <div className="builder-countRow"><div className="builder-field"><label htmlFor="competitor-count">Number of competitors</label><select id="competitor-count" value={count} onChange={event => setCount(Number(event.target.value))}>{Array.from({ length: 31 }, (_, index) => index + 2).map(number => <option key={number} value={number}>{number} competitors</option>)}</select></div><p>{roundNames(count).length} rounds · Single elimination<br /><span>{byes ? `${byes} automatic first-round ${byes === 1 ? "bye" : "byes"}.` : "An even field. No byes needed."}</span></p></div>
        </section>
        <section className="builder-section" aria-labelledby="competitors-heading">
          <div className="builder-sectionTitle"><span>02</span><div><h2 id="competitors-heading">Meet the contenders</h2><p>Movies, snacks, teams. Everything’s game.</p></div><span className="builder-progress">{filled}/{count}</span></div>
          <p className="builder-hint">Entry order sets the seeds. Top seeds receive any byes. Names can be up to {COMPETITOR_LIMIT} characters; initials become their thumbnails.</p>
          <div id="names-error" className="builder-error" role="status">{submitted && errors.names}</div>
          <div className="builder-competitorGrid">{config.names.map((name, index) => {
            const duplicate = Boolean(name.trim()) && config.names.some((other, otherIndex) => index !== otherIndex && other.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
            const invalid = submitted && (!name.trim() || duplicate);
            return <div key={index} className="builder-competitorField"><label htmlFor={`competitor-${index}`}><span className="builder-seed">{String(index + 1).padStart(2, "0")}</span><span>Competitor {index + 1}</span></label><input id={`competitor-${index}`} required placeholder={`Name competitor ${index + 1}`} maxLength={COMPETITOR_LIMIT} value={name} aria-invalid={invalid} aria-describedby={`count-${index}${invalid ? " names-error" : ""}`} onChange={event => setNames(previous => previous.map((value, nameIndex) => nameIndex === index ? event.target.value : value))} /><span id={`count-${index}`} className="builder-counter">{name.length}/{COMPETITOR_LIMIT}</span></div>;
          })}</div>
        </section>
        <section className="builder-section" aria-labelledby="trophy-heading">
          <div className="builder-sectionTitle"><span>03</span><div><h2 id="trophy-heading">Choose what’s at stake</h2><p>Find a prize worthy of the rivalry.</p></div><Icon name="trophy" /></div>
          <div className="builder-categories" role="group" aria-label="Trophy categories">{TROPHY_CATEGORIES.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}<span>5</span></button>)}</div>
          <div className="builder-trophyGrid" role="group" aria-label={`${category} trophies`}>{TROPHIES.filter(item => item.category === category).map(item => <button key={item.id} type="button" className="builder-trophyChoice" aria-pressed={trophyId === item.id} onClick={() => setTrophyId(item.id)}><span className="builder-check" aria-hidden="true">{trophyId === item.id ? "✓" : ""}</span><Image src={item.src} alt="" width={168} height={168} /><span className="builder-trophyLabel"><strong>{item.name}</strong><small>{item.subjectLabel}</small></span></button>)}</div>
          <p className="builder-hint">Twenty virtual prizes. Your pick takes center stage.</p>
        </section>
      </div>
      <aside className="builder-summary" aria-label="Bracket setup summary"><div className="builder-summaryTop"><Icon name="spark" /><span>THE STAGE IS YOURS</span></div><div className="builder-miniBracket" aria-hidden="true"><span /><span /><span /><span /></div><Image className="builder-summaryTrophy" src={trophy.src} alt="" width={176} height={176} /><p className="builder-prize" aria-live="polite">{trophy.name}</p><h2>{title.trim() || "Your next great rivalry"}</h2><div className="builder-summaryStats"><div><strong>{count}</strong><span>competitors</span></div><div><strong>{roundNames(count).length}</strong><span>rounds</span></div><div><strong>1</strong><span>winner</span></div></div><div className="builder-readiness"><Icon name={filled === count ? "check" : "user"} /><span>{filled === count ? "Contenders ready. Bring it on." : `${count - filled} contenders still need a name.`}</span></div><button className="builder-submit" type="submit">Build my bracket <Icon name="arrow" /></button>{submitted && Object.keys(errors).length > 0 && <p className="builder-error" role="alert">Check the highlighted fields to finish your bracket.</p>}{storageError && <p className="builder-error" role="alert">{storageError}</p>}<p className="builder-localNote">Local preview · stays in this browser tab.<br />Nothing is published or shared yet.</p></aside>
    </form>
  </div>;
}
