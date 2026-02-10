import { Card } from "@/components/ui/card";

function TipsCard({ title, children }) {
  return (
    <Card className="bg-stone-800 text-stone-100 rounded-sm border-2 border-amber-400 p-6 shadow-stone-900 shadow-md">
      <div className="flex flex-row items-center lg:px-2 gap-6 text-sm leading-relaxed">
        <span className="text-amber-400 text-2xl">💡</span>
        <h2 className="text-lg font-bold text-amber-400">{title}</h2>
        {children}
      </div>
    </Card>
  );
}

export default TipsCard;
