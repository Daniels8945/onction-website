import { credentials } from "../data/content.js";
import { Check } from "./icons.jsx";

export default function Credentials() {
  return (
    <section className="border-b border-black/5 bg-navy-900">
      <div className="wrap py-5">
        <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-center">
          {credentials.map((c) => (
            <li key={c} className="flex items-center gap-2 text-sm text-white/80">
              <Check width={16} height={16} className="text-teal-400" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
