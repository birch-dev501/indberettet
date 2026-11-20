"use client";

import { useEffect } from "react";

export function TableHeaderPin() {
  useEffect(() => {
    const pin = () => {
      const header = document.querySelector(".site-header");
      if (!(header instanceof HTMLElement)) return;
      const site = header.getBoundingClientRect().bottom;
      for (const scroller of document.querySelectorAll(".table-scroll")) {
        if (!(scroller instanceof HTMLElement)) continue;
        const thead = scroller.querySelector("thead");
        if (!(thead instanceof HTMLElement)) continue;
        thead.style.transform = "none";
        const box = scroller.getBoundingClientRect();
        const head = thead.getBoundingClientRect();
        if (head.height < 1 || box.bottom - head.height <= site || box.top >= window.innerHeight) continue;
        const shift = site - head.top;
        if (shift > 0.5) thead.style.transform = `translateY(${shift}px)`;
      }
    };
    pin();
    window.addEventListener("scroll", pin, { passive: true });
    window.addEventListener("resize", pin);
    document.addEventListener("toggle", pin, true);
    return () => {
      window.removeEventListener("scroll", pin);
      window.removeEventListener("resize", pin);
      document.removeEventListener("toggle", pin, true);
    };
  }, []);
  return null;
}
