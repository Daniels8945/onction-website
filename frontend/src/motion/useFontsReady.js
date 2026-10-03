import { useEffect, useState } from "react";

// Resolves once the web fonts have loaded (or after `timeout` ms, so a slow
// font CDN never hides content for long). Hero text waits on this so its
// reveal plays in the final typeface rather than reflowing mid-animation.
let ready = typeof document === "undefined" || !document.fonts || document.fonts.status === "loaded";

export function useFontsReady(timeout = 900) {
  const [ok, setOk] = useState(ready);
  useEffect(() => {
    if (ok) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ready = true;
      setOk(true);
    };
    document.fonts.ready.then(finish);
    const t = setTimeout(finish, timeout);
    return () => clearTimeout(t);
  }, [ok, timeout]);
  return ok;
}
