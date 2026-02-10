import { Card } from "@/components/ui/card";

function TipsCard({ title, children }) {
  return (
    <div className="@container">
      <Card className="bg-stone-800 text-stone-100 rounded-sm border-2 border-amber-400 p-6 shadow-stone-900 shadow-md">
        <div className="flex flex-col @lg:flex-row @lg:items-center @lg:px-2 gap-4 @lg:gap-6 text-sm leading-relaxed">
          <div className="flex flex-row items-center gap-3 shrink-0">
            <span className="text-amber-400 text-2xl">💡</span>
            <h2 className="text-lg font-bold text-amber-400">{title}</h2>
          </div>
          {children}
        </div>
      </Card>
    </div>
  );
}

export default TipsCard;
