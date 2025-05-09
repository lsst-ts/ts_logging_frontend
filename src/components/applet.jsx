import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


function Applet({...props}) {
  return (
    // <Card className={cn("w-[650px]", className)} {...props}>
      <Card className="rounded-md border-none pt-0 pb-0 bg-gray-800 gap-3">
      <CardHeader className="bg-teal-900 py-3 rounded-xs border-teal-900 ">
        <CardTitle className="text-white font-light">Content Header</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black py-2 text-neutral-200 rounded-sm border-teal-900 h-80">
          <div> Content goes here!</div>
      </CardContent>
    </Card>
  )
}

export default Applet