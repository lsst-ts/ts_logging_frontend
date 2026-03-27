import { useState } from "react";
import { X } from "lucide-react";

export function NotificationBanner({
  type = "info", // "maintenance" | "noData" | "error"
  // source,
  title,
  description,
  dismissible = false,
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const styles = {
    maintenance: {
      container: "bg-stone-900/70 border-blue-400/70",
      icon: "text-blue-300",
      title: "text-stone-100",
    },
    noData: {
      container: "bg-stone-700/50 border-stone-400/60",
      icon: "text-stone-300",
      title: "text-stone-100",
    },
    error: {
      container: "bg-stone-900/70 border-red-400/70",
      icon: "text-red-300",
      title: "text-stone-100",
    },
  };

  const style = styles[type];

  return (
    <div className={`relative rounded-md border px-4 py-3 ${style.container}`}>
      {/* Close button */}
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          className="absolute right-2 top-2 p-1 text-stone-400 hover:text-stone-200"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-3 pr-6">
        {/* Icon */}
        <div className={`${style.icon}`}>
          {type === "maintenance" && "🛠"}
          {type === "noData" && "📭"}
          {type === "error" && "⚠"}
        </div>

        {/* Content */}
        <div>
          <div className={`font-medium ${style.title}`}>{title}</div>
          <div className="text-sm text-stone-200">{description}</div>
        </div>
      </div>
    </div>
  );
}
