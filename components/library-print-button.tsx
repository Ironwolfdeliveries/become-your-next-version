"use client";

export function LibraryPrintButton() {
  function print() {
    const sections = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-library-step]"));
    const previous = sections.map(section => section.open);
    sections.forEach(section => { section.open = true; });
    const restore = () => { sections.forEach((section, index) => { section.open = previous[index]; }); };
    window.addEventListener("afterprint", restore, { once: true });
    window.print();
  }
  return <button className="library-print-button" type="button" onClick={print}>Print this guide</button>;
}
