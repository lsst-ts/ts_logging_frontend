function MetricsTimeLoss({timeLoss, weatherPercentage, faultPercentage}){
    return (
        <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
            <div className="text-2xl font-light">{timeLoss} Hours</div>
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
            <div className="text-sm font-light">({weatherPercentage}% weather; {faultPercentage}% fault)</div>
        </div>
    )
}

export default MetricsTimeLoss