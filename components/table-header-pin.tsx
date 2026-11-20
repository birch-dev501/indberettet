"use client";

import { useEffect } from "react";

function currentShift(value: string): number {
  const match = /translateY\(([-\d.]+)px\)/.exec(value);
  return match ? Number(match[1]) : 0;
}

export function TableHeaderPin() {
  useEffect(() => {
    let frame = 0;
    const pin = () => {
      const header = document.querySelector(".site-header");
      if (!(header instanceof HTMLElement)) return;
      const site = header.getBoundingClientRect().bottom;
      const rows: { thead: HTMLElement; shift: number }[] = [];
      for (const scroller of document.querySelectorAll(".table-scroll")) {
        if (!(scroller instanceof HTMLElement)) continue;
        const thead = scroller.querySelector("thead");
        if (!(thead instanceof HTMLElement)) continue;
        const box = scroller.getBoundingClientRect();
        const head = thead.getBoundingClientRect();
        const stuck = head.height >= 1 && box.top < site && box.bottom - head.height > site && box.top < window.innerHeight;
        const shift = stuck ? currentShift(thead.style.transform) + (site - head.top) : 0;
        rows.push({ thead, shift });
      }
      for (const row of rows) {
        row.thead.style.transform = row.shift > 0.5 ? `translateY(${row.shift}px)` : "";
      }
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pin();
      });
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("toggle", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("toggle", schedule, true);
    };
  }, []);
  return null;
}
