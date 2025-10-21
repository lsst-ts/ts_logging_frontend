import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar.jsx";
import Parameters from "@/components/parameters";
import { fetchBackendVersion } from "@/utils/fetchUtils";
import { parseBackendVersion } from "@/utils/utils";
import NavMenu from "@/components/NavMenu";
import RubinIcon from "../assets/RubinIcon.svg";
import packageJson from "../../package.json";

export function AppSidebar({ ...props }) {
  const [backendVersion, setBackendVersion] = useState("main");
  useEffect(() => {
    const abortController = new AbortController();
    fetchBackendVersion(abortController.signal).then((backendVersionString) => {
      const parsedVersion = parseBackendVersion(backendVersionString);
      setBackendVersion(parsedVersion);
    });
    return () => {
      abortController.abort();
    };
  }, []);

  const frontendReleaseNotesHref =
    "https://github.com/lsst-ts/ts_logging_frontend" +
    `/blob/v${packageJson.version}/doc/version_history.rst`;

  const backendReleaseNotesHref =
    "https://github.com/lsst-ts/ts_logging_and_reporting" +
    `/blob/v${backendVersion}/doc/version_history.rst`;

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
      <SidebarFooter className="pl-10 pr-8 py-8">
        <div className="text-xs text-gray-500">
          <p>
            Nightly Digest{" "}
            <strong>
              v{packageJson.version} ({packageJson.lastUpdated})
            </strong>
          </p>
          <p>
            Release Notes{" "}
            <a
              className="text-blue-500 hover:underline"
              target="_blank"
              href={frontendReleaseNotesHref}
            >
              Frontend
            </a>
            {" | "}
            <a
              className="text-blue-500 hover:underline"
              target="_blank"
              href={backendReleaseNotesHref}
            >
              Backend
            </a>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
