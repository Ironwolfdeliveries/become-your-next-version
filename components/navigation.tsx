"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation } from "@/lib/data";

export function Navigation() {
  const [open, setOpen] = useState(false); const path = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return <header className="site-header"><a className="skip" href="#content">Skip to content</a><div className="nav-shell container">
    <Link className="brand" href="/" onClick={() => setOpen(false)}><span>BYNV</span><small>Become Your Next Version</small></Link>
    <button type="button" className="menu" aria-expanded={open} aria-controls="main-nav" aria-label={`${open ? "Close" : "Open"} main menu`} onClick={() => setOpen(!open)}><span aria-hidden="true">{open ? "Close" : "Menu"}</span></button>
    <nav id="main-nav" aria-label="Main navigation" className={open ? "nav-links open" : "nav-links"}>{navigation.map((item) => <Link aria-current={path === item.href ? "page" : undefined} key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}<Link className="nav-cta" href="/assessment" onClick={() => setOpen(false)}>Free assessment</Link></nav>
  </div></header>;
}
