function MetricsExposures ({noOfExposures, noOfExpectedExposures}) {
    return (
        <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
            <div className="text-2xl font-light">{noOfExposures}</div>
            <div className="absolute right-3 top-2">
                <svg width="38" height="37" viewBox="0 0 38 37" fill="none"
                     xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M26.4494 34.4289L12.0613 20.0408M36.232 19.7619L17.1445 24.8763M28.3562 4.10968L23.2923 23.0082M10.8447 2.84783L24.6794 16.6825M1.78277 16.6144L19.7364 11.8038M8.65911 32.3959L13.723 13.4974M36.9 18.5C36.9 28.4411 28.8411 36.5 18.9 36.5C8.9589 36.5 0.900024 28.4411 0.900024 18.5C0.900024 8.55887 8.9589 0.5 18.9 0.5C28.8411 0.5 36.9 8.55887 36.9 18.5Z"
                        stroke="white" strokeLinecap="round"/>
                </svg>
            </div>
            <div className="text-md font-light pt-2">Nighttime exposures taken</div>
            <div className="text-xs font-light">({noOfExpectedExposures} expected)</div>
        </div>
    )
}
export default MetricsExposures