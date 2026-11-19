"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Keep the viewport still while the referenced field is receiving text. */
export function usePinScroll(inputRef: RefObject<HTMLInputElement | null>) {
  const armedUntil = useRef(0);
  const y = useRef(0);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const arm = () => {
      y.current = window.scrollY;
      armedUntil.current = performance.now() + 700;
    };
    const onScroll = () => {
      if (performance.now() > armedUntil.current) return;
      if (window.scrollY === y.current) return;
      window.scrollTo({ top: y.current, left: 0, behavior: "instant" });
    };
    input.addEventListener("keydown", arm);
    input.addEventListener("beforeinput", arm);
    window.addEventListener("scroll", onScroll);
    return () => {
      input.removeEventListener("keydown", arm);
      input.removeEventListener("beforeinput", arm);
      window.removeEventListener("scroll", onScroll);
    };
  }, [inputRef]);
}
