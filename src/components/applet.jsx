import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Applet() {
  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-rows-1 bg-teal-900 p-4 rounded-sm align-center">
        <CardTitle className="text-white font-thin">Content Header</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin">
        <div> Content goes here. </div>
      </CardContent>
    </Card>
  );
}

export default Applet;
