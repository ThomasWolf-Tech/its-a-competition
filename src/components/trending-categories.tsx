"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/icon";
import type { BracketCategory } from "@/lib/bracket-categories";

type CategoryView = { id: BracketCategory; name: string; hasBrackets: boolean; content: ReactNode };

function subscribeHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
function currentHash() { return window.location.hash.slice(1); }

export default function TrendingCategories({ categories }: { categories: CategoryView[] }) {
  const searchParams = useSearchParams();
  // Keep links from the previous category-anchor layout working, too.
  const legacyCategory = useSyncExternalStore(subscribeHash, currentHash, () => "");
  const requested = searchParams.get("category") ?? legacyCategory;
  const selected = categories.find(category => category.id === requested)
    ?? categories.find(category => category.hasBrackets) ?? categories[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const options = categories.filter(category => category.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function show() {
    setQuery("");
    setActive(categories.findIndex(category => category.id === selected.id));
    setOpen(true);
  }

  function choose(category: CategoryView) {
    const url = new URL(window.location.href);
    url.searchParams.set("category", category.id);
    url.hash = "";
    if (`${url.pathname}${url.search}` !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      // Preserve the loaded ranking snapshot while making selection shareable.
      window.history.pushState(null, "", `${url.pathname}${url.search}`);
    }
    setOpen(false);
    button.current?.focus();
  }

  function navigate(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!options.length) return;
      setActive(index => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    }
  }

  return <>
    <div className="trending-picker" ref={root} onKeyDown={event => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        button.current?.focus();
      }
    }} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <span className="trending-picker-label" id={`${id}-label`}>Category</span>
      <button ref={button} type="button" className="trending-picker-trigger" aria-haspopup="listbox"
        aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => open ? setOpen(false) : show()} onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(); }
        }}>
        <span id={`${id}-value`}>{selected.name}</span><Icon name="chevron" />
      </button>
      {open && <div className="trending-picker-popup">
        <div className="trending-picker-search"><Icon name="search" /><input ref={input} role="combobox" type="text"
          aria-label="Search categories" placeholder="Search categories…" autoComplete="off" spellCheck={false}
          aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`}
          aria-activedescendant={options[active] ? `${id}-option-${active}` : undefined}
          value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={navigate} /></div>
        <ul className="trending-picker-options" id={`${id}-list`} role="listbox" aria-label="Categories">
          {options.map((category, index) => <li role="option" id={`${id}-option-${index}`} key={category.id}
            aria-selected={category.id === selected.id} className={index === active ? "is-active" : undefined}
            onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(category)}>
            <span>{category.name}</span>{category.id === selected.id && <Icon name="check" />}
          </li>)}
        </ul>
        {!options.length && <p className="trending-picker-no-results" role="status">No categories found.</p>}
      </div>}
    </div>
    {selected.content}
  </>;
}
