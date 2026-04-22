import { X } from "lucide-react";

const config = {
  // systemNotice kept for future PR — do not remove
  systemNotice: {
    dismissible: true,
    icon: "i",
    container:
      "bg-indigo-950 border-l-indigo-400 border-t-indigo-900 border-r-indigo-900 border-b-indigo-900",
    icon_style: "bg-indigo-900 border-indigo-400 text-indigo-300",
    title: "text-indigo-200",
    description: "text-indigo-300",
    meta: "text-indigo-400",
    dismiss: "text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900",
  },
  noData: {
    dismissible: true,
    icon: "–",
    container:
      "bg-stone-900 border-l-slate-400 border-t-slate-700 border-r-slate-700 border-b-slate-700",
    icon_style: "bg-slate-700 border-slate-400 text-slate-300",
    title: "text-slate-100",
    description: "text-slate-300",
    meta: "text-slate-400",
    dismiss: "text-slate-400 hover:text-slate-100 hover:bg-slate-700",
  },
  error: {
    dismissible: false,
    icon: "!",
    container:
      "bg-red-950/60 border-l-red-500 border-t-red-950 border-r-red-950 border-b-red-950",
    icon_style: "bg-red-900 border-red-500 text-red-300",
    title: "text-red-200",
    description: "text-red-300",
    meta: "text-red-400",
    dismiss: "",
  },
  // systemicError: {
  //   dismissible: false,
  //   icon: "!",
  //   container:
  //     "bg-red-950/60 border-l-red-500 border-t-red-950 border-r-red-950 border-b-red-950",
  //   icon_style: "bg-red-900 border-red-500 text-red-300",
  //   title: "text-red-200",
  //   description: "text-red-300",
  //   meta: "text-red-400",
  //   dismiss: "",
  // },
};

export function NotificationBanner({
  type,
  title,
  description,
  meta,
  onDismiss,
}) {
  // const [visible, setVisible] = useState(true);
  // if (!visible) return null;

  const c = config[type];
  if (!c) return null;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border-l-[3px] border-t border-r border-b text-sm ${c.container}`}
    >
      <span
        className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-full border text-[10px] font-semibold ${c.icon_style}`}
      >
        {c.icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${c.title}`}>{title}</p>
        {description && (
          <p className={`mt-0.5 text-xs ${c.description}`}>{description}</p>
        )}
        {meta && (
          <p className={`mt-1 text-[11px] opacity-85 ${c.meta}`}>{meta}</p>
        )}
      </div>

      {c.dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`flex-shrink-0 flex items-center justify-center w-[22px] h-[22px] rounded border-none bg-transparent cursor-pointer transition-colors ${c.dismiss}`}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
