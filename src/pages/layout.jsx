import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar.jsx";
import {AppSidebar} from "@/components/app-sidebar.jsx"
import Applet from "@/components/applet.jsx";
import MetricsJira from "@/components/metrics-jira.jsx";

export default function Layout({children}) {

    return (
        <>
            <SidebarProvider>
                <AppSidebar/>
                <main className="flex bg-gray-800">
                    <SidebarTrigger/>
                    {children}
                </main>
                <div className="w-full bg-gray-800">
                    <div className="grid grid-cols-4 gap-20 pt-8 pr-8">
                        <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
                            <div className="text-2xl font-light">838</div>
                            <div className="absolute right-3 top-2">
                                <svg width="38" height="37" viewBox="0 0 38 37" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M26.4494 34.4289L12.0613 20.0408M36.232 19.7619L17.1445 24.8763M28.3562 4.10968L23.2923 23.0082M10.8447 2.84783L24.6794 16.6825M1.78277 16.6144L19.7364 11.8038M8.65911 32.3959L13.723 13.4974M36.9 18.5C36.9 28.4411 28.8411 36.5 18.9 36.5C8.9589 36.5 0.900024 28.4411 0.900024 18.5C0.900024 8.55887 8.9589 0.5 18.9 0.5C28.8411 0.5 36.9 8.55887 36.9 18.5Z"
                                        stroke="white" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div className="text-md font-light pt-2">Nighttime exposures taken</div>
                            <div className="text-xs font-light">(843 expected)</div>
                        </div>
                        <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
                            <div className="text-2xl font-light">92 %</div>
                            <div className="absolute right-3 top-2">
                                <svg width="37" height="37" viewBox="0 0 37 37" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_576_2036)">
                                        <path
                                            d="M36.2667 18.5C36.2667 22.8829 34.6676 27.1152 31.7692 30.403C28.8709 33.6908 24.8726 35.8082 20.5243 36.3579C16.176 36.9076 11.7765 35.8519 8.15117 33.3888C4.52583 30.9257 1.92373 27.2245 0.833007 22.9795C-0.257718 18.7344 0.237878 14.2373 2.22683 10.3317C4.21577 6.42603 7.5614 3.38028 11.6361 1.76576C15.7108 0.151235 20.2346 0.0788879 24.3588 1.56229C28.4831 3.04569 31.9244 5.9829 34.0372 9.82294L27.729 13.2938C26.4613 10.9897 24.3965 9.22741 21.922 8.33737C19.4474 7.44733 16.7332 7.49074 14.2884 8.45945C11.8435 9.42817 9.83615 11.2556 8.64279 13.599C7.44942 15.9424 7.15206 18.6407 7.80649 21.1877C8.46093 23.7347 10.0222 25.9554 12.1974 27.4333C14.3726 28.9111 17.0123 29.5445 19.6213 29.2147C22.2302 28.8849 24.6292 27.6145 26.3682 25.6418C28.1072 23.6691 29.0667 21.1297 29.0667 18.5H36.2667Z"
                                            fill="white"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_576_2036">
                                            <rect width="36" height="36" fill="white"
                                                  transform="translate(0.266724 0.5)"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                            <div className="text-md font-light pt-4">On-sky open-shutter efficiency</div>
                        </div>
                        <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
                            <div className="text-2xl font-light">0.8 Hours</div>
                            <div className="absolute right-3 top-2">
                                <svg width="37" height="37" viewBox="0 0 37 37" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_576_2042)">
                                        <path
                                            d="M15.5637 35.0822L12.7303 18.0822C12.6795 17.7774 12.9146 17.5 13.2235 17.5H31.0431C31.352 17.5 31.5871 17.7774 31.5363 18.0822L28.7029 35.0822C28.6628 35.3233 28.4542 35.5 28.2097 35.5H16.0569C15.8124 35.5 15.6038 35.3233 15.5637 35.0822Z"
                                            stroke="white"/>
                                        <path d="M22.1333 20.5V32.5" stroke="white" strokeLinecap="round"/>
                                        <path d="M16.6333 20.5L18.6333 32.5" stroke="white" strokeLinecap="round"/>
                                        <path d="M25.6333 32.5L27.6333 20.5" stroke="white" strokeLinecap="round"/>
                                        <g clipPath="url(#clip1_576_2042)">
                                            <circle cx="22.1333" cy="15" r="8" stroke="white"/>
                                            <line x1="22.1333" y1="9" x2="22.1333" y2="10" stroke="white"
                                                  strokeLinecap="round"/>
                                            <line x1="28.1333" y1="15" x2="27.1333" y2="15" stroke="white"
                                                  strokeLinecap="round"/>
                                            <line x1="17.1333" y1="15" x2="16.1333" y2="15" stroke="white"
                                                  strokeLinecap="round"/>
                                            <path d="M22.1333 15L19.6333 12.5" stroke="white" strokeLinecap="round"/>
                                            <path d="M22.1333 15L26.1333 11" stroke="white" strokeLinecap="round"/>
                                        </g>
                                        <mask id="path-11-inside-1_576_2042" fill="white">
                                            <rect x="4.83252" y="14.2058" width="19" height="3" rx="0.5"
                                                  transform="rotate(-45 4.83252 14.2058)"/>
                                        </mask>
                                        <rect x="4.83252" y="14.2058" width="19" height="3" rx="0.5"
                                              transform="rotate(-45 4.83252 14.2058)" stroke="white" strokeWidth="2"
                                              mask="url(#path-11-inside-1_576_2042)"/>
                                        <mask id="path-12-inside-2_576_2042" fill="white">
                                            <path
                                                d="M7.18021 8.78251C6.98495 8.58725 6.98495 8.27066 7.18021 8.0754L11.4229 3.83276C11.6181 3.6375 11.9347 3.6375 12.13 3.83276L14.3181 6.02088L9.36833 10.9706L7.18021 8.78251Z"/>
                                        </mask>
                                        <path
                                            d="M7.18021 8.78251C6.98495 8.58725 6.98495 8.27066 7.18021 8.0754L11.4229 3.83276C11.6181 3.6375 11.9347 3.6375 12.13 3.83276L14.3181 6.02088L9.36833 10.9706L7.18021 8.78251Z"
                                            stroke="white" strokeWidth="2" mask="url(#path-12-inside-2_576_2042)"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_576_2042">
                                            <rect width="36" height="36" fill="white"
                                                  transform="translate(0.633301 0.5)"/>
                                        </clipPath>
                                        <clipPath id="clip1_576_2042">
                                            <rect width="17" height="11" fill="white"
                                                  transform="translate(13.6333 6.5)"/>
                                        </clipPath>
                                    </defs>
                                </svg>

                            </div>
                            <div className="text-md font-light pt-4">Time Loss</div>
                            <div className="text-sm font-light">(90% weather; 20% fault)</div>
                        </div>
                        <MetricsJira noOfTickets="1"/>
                    </div>
                    <div className="grid grid-cols-2 gap-10 pt-8 pl-4 pr-14">
                        <Applet/>
                        <Applet/>
                    </div>
                </div>
            </SidebarProvider>
        </>
    )
}