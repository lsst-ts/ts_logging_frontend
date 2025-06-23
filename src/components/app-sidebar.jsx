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

        <SidebarGroup className="pt-10">
          <SidebarGroupContent>
            <NavMenu activeKey="digest" />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
