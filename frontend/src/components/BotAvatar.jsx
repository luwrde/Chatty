import { Bot } from "lucide-react";
import { BOT_DISPLAY_NAME } from "../constants";

// Round bot avatar; className sets the size and colors (e.g. "size-8 bg-primary/10 text-primary")
const BotAvatar = ({ className = "size-8 bg-primary/10 text-primary", iconClassName = "size-1/2" }) => {
  return (
    <div className={`shrink-0 rounded-full grid place-items-center ${className}`} role="img" aria-label={BOT_DISPLAY_NAME}>
      <Bot className={iconClassName} aria-hidden="true" />
    </div>
  );
};

export default BotAvatar;
