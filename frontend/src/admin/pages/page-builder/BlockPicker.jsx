import { BLOCK_TYPES, BLOCK_TYPE_KEYS } from "../../../blocks/blockTypes.js";
import { Modal } from "../../components/ui.jsx";
import { BLOCK_ICONS } from "./blockIcons.js";

export default function BlockPicker({ position, onPick, onClose }) {
  return (
    <Modal
      title="Add a block"
      description={position === "end" ? "Blocks stack top to bottom on the page." : "The block will be inserted at this point on the page."}
      size="lg"
      onClose={onClose}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {BLOCK_TYPE_KEYS.map((key) => {
          const def = BLOCK_TYPES[key];
          const Icon = BLOCK_ICONS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="flex items-start gap-3 rounded-lg border border-black/[0.08] p-3 text-left transition hover:border-teal-500 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mist text-ink ring-1 ring-black/5">
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{def.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slatey">{def.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
