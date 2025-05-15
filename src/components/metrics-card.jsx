import InfoIcon from "../assets/InfoIcon.svg";

export default function MetricsCard({ icon, data, label, metadata, tooltip }) {
  return (
    <div className="flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1]">
      <div className="flex flex-row justify-between h-12">
        <div className="text-2xl">{data}</div>
        {icon && <img src={icon} />}
      </div>
      <div className="flex flex-row justify-between min-h-12">
        <div className="flex flex-col justify-between">
          <div className="text-md">{label}</div>
          {metadata && <div className="text-sm">{metadata}</div>}
        </div>
        {tooltip && <img src={InfoIcon} className="self-end"/>}
      </div>
    </div>
  );
}
