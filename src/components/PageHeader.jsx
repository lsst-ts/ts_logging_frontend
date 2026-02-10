import { Card, CardHeader, CardTitle } from "@/components/ui/card";

function PageHeader({ title, description, actions }) {
  return (
    <Card className="border-none p-0 bg-stone-800">
      <CardHeader className="flex flex-row gap-4 bg-teal-900 p-3 rounded-sm items-center shadow-stone-900 shadow-md">
        <CardTitle className="flex flex-row gap-2 text-white font-thin">
          <span className="font-normal">{title}: </span>
          <span>{description}</span>
        </CardTitle>
        {actions && (
          <div className="justify-end ml-auto">
            <div className="flex flex-row gap-2 justify-end">{actions}</div>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

export default PageHeader;
