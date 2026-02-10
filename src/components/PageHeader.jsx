import { Card, CardHeader, CardTitle } from "@/components/ui/card";

function PageHeader({ title, description, actions }) {
  return (
    <div className="@container">
      <Card className="border-none p-0 bg-stone-800">
        <CardHeader className="flex flex-col @lg:flex-row gap-2 @lg:gap-4 bg-teal-900 p-3 rounded-sm @lg:items-center shadow-stone-900 shadow-md">
          <CardTitle className="flex flex-row gap-2 text-white font-thin min-w-0">
            <span className="font-normal shrink-0">{title}: </span>
            <span className="break-words min-w-0">{description}</span>
          </CardTitle>
          {actions && (
            <div className="ml-auto shrink-0">
              <div className="flex flex-row gap-2">{actions}</div>
            </div>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}

export default PageHeader;
