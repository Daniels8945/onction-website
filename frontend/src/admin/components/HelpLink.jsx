import { LuCircleHelp } from "react-icons/lu";
import { Button } from "./ui.jsx";

// Contextual link from a dashboard page to its guide in the Help Centre.
export default function HelpLink({ topic, label = "Help" }) {
  return (
    <Button variant="ghost" icon={LuCircleHelp} to={`/admin/help/${topic}`} title="Open the guide for this page">
      {label}
    </Button>
  );
}
