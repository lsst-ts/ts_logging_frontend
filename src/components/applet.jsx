import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function Applet({...props}) {
  return (
      <Card className="rounded-md border-none pt-0 pb-0 bg-gray-800 gap-3">
      <CardHeader className="bg-teal-900 py-3 rounded-xs border-teal-900 ">
        <CardTitle className="text-white font-light">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black py-2 text-neutral-200 rounded-sm border-teal-900 h-64">
          <di> Content goes here!</di>
      </CardContent>
    </Card>
  )
}

export default Applet