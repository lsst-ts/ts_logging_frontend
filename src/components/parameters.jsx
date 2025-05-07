import * as React from "react"
import {ComboBox} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import {DatePicker} from "@/components/ui/datepicker.jsx"

const instruments = [
    {
        value: "comcam",
        label: "ComCam",
    },
    {
        value: "lsstcam",
        label: "LSSTCam"
    },
]
function Parameters() {
    return (
        <>
            <div className="pt-3">
                <Label htmlFor="instruments" className="text-white text-base pb-1"> Instruments </Label>
                <ComboBox id="instruments" options={instruments} />
            </div>
            <div className="pt-8">
                <Label htmlFor="dayobsstart" className="text-white text-base pb-1"> Dayobs - start </Label>
                <DatePicker id="dayobsstart" />
            </div>
            <div className="pt-8">
                <Label htmlFor="dayobsend" className="text-white text-base pb-1"> Dayobs - end </Label>
                <DatePicker id="dayobsend" />
            </div>
        </>
    )
}

export default Parameters