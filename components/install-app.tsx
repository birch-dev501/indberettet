"use client";

import { useEffect, useState } from "react";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/indberettet";
const IOS_KEY = "indberettet-ios-hint";
const INSTALL_KEY = "indberettet-install-dismiss";

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function iosSafari() {
  const ua = navigator.userAgent;
  const apple =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
  return apple && safari;
}

export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstall | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) {
          hadController = true;
          return;
        }
        window.location.reload();
      });
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => undefined);
    }
    if (standalone()) {
      setReady(true);
      return;
    }
    const iosDismissed = localStorage.getItem(IOS_KEY) === "1";
    const installDismissed = localStorage.getItem(INSTALL_KEY) === "1";
    setShowIos(iosSafari() && !iosDismissed);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (!installDismissed) setPromptEvent(event as BeforeInstall);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    setReady(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!ready || standalone()) return null;

  if (promptEvent) {
    return (
      <div className="install-bar" id="installer-app">
        <span>Installer appen</span>
        <button
          type="button"
          className="button"
          onClick={async () => {
            await promptEvent.prompt();
            setPromptEvent(null);
          }}
        >
          Installer
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            localStorage.setItem(INSTALL_KEY, "1");
            setPromptEvent(null);
          }}
        >
          Ikke nu
        </button>
      </div>
    );
  }

  if (!showIos) return null;
  return (
    <div className="install-bar install-ios" id="ios-install-hint">
      <p>På iPhone: tryk Del og vælg Føj til hjemmeskærm.</p>
      <button
        type="button"
        className="button"
        onClick={() => {
          localStorage.setItem(IOS_KEY, "1");
          setShowIos(false);
        }}
      >
        Luk
      </button>
    </div>
  );
}
