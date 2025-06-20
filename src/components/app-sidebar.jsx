import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupContent,
} from "@/components/ui/sidebar.jsx";
import Parameters from "@/components/parameters";
import NavMenu from "@/components/navMenu";
import RubinIcon from "../assets/RubinIcon.svg";
// import { getDayobsStr, getDatetimeFromDayobsStr } from "@/utils/fetchUtils";

export function AppSidebar({ ...props }) {
  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-6 py-8">
        <div className="flex flex-row justify-center gap-2">
          <img
            src={RubinIcon}
            className="w-18 h-auto"
            alt="Rubin Observatory icon"
          />
          <h1 className="flex flex-col justify-between text-white text-3xl uppercase text-left">
            <span className="font-extrabold">Nightly</span>
            <span className="tracking-[5px]">Digest</span>
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-7">
        <SidebarGroup>
          <SidebarGroupContent>
            <Parameters
              dayobs={props.dayobs}
              onDayobsChange={props.onDayobsChange}
              noOfNights={props.noOfNights}
              onNoOfNightsChange={props.onNoOfNightsChange}
              instrument={props.instrument}
              onInstrumentChange={props.onInstrumentChange}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* dayobs on one line */}
        {/* <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <div className="py-8">
              <span className="text-[14px] font-extralight text-white bg-green-500/20 px-2 py-2 rounded-md whitespace-nowrap">
                <span className="font-semibold text-[12px]">dayobs:{" "}</span>
                {(() => {
                  const dayobsDate = getDatetimeFromDayobsStr(getDayobsStr(props.dayobs));
                  const startDate = dayobsDate.minus({ days: props.noOfNights - 1 });
                  const startStr = startDate.toFormat("yyyyLLdd");
                  const endStr = dayobsDate.toFormat("yyyyLLdd");

                  return (props.noOfNights === 1 || startStr === endStr)
                    ? endStr
                    : `${startStr} - ${endStr}`;
                })()}
              </span>
            </div>
          </SidebarGroupContent>
        </SidebarGroup> */}

        {/* dayobs on two lines */}
        {/* <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <div className="mt-8 w-[200px] text-[14px] font-extralight text-white border border-green-500/20 px-2 py-2 rounded-md">
              <div className="font-semibold">dayobs:</div>
              <div className="mt-1 ml-4 bg-green-500/20 px-2 py-2 rounded-md inline-block">
                {(() => {
                  const dayobsDate = getDatetimeFromDayobsStr(getDayobsStr(props.dayobs));
                  const startDate = dayobsDate.minus({ days: props.noOfNights - 1 });
                  const startStr = startDate.toFormat("yyyyLLdd");
                  const endStr = dayobsDate.toFormat("yyyyLLdd");

                  return (props.noOfNights === 1 || startStr === endStr)
                    ? endStr
                    : `${startStr} - ${endStr}`;
                })()}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup> */}

        <SidebarGroup className="pt-10">
          <SidebarGroupContent>
            <NavMenu activeKey="digest" />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
