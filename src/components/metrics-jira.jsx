function MetricsJira ({noOfTickets}){
    return (
        <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
            <div className="text-2xl font-light">{noOfTickets}</div>
            <div className="absolute right-3 top-2">
                <svg width="36" height="37" viewBox="0 0 36 37" fill="none"
                     xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M34.4961 0.5H17.1604C17.1604 2.57549 17.9849 4.56598 19.4525 6.03357C20.9201 7.50117 22.9106 8.32565 24.9861 8.32565H28.1795V11.4088C28.1822 15.7269 31.682 19.2267 36.0001 19.2294V2.00397C36.0001 1.17335 35.3268 0.5 34.4961 0.5Z"
                        fill="white"/>
                    <path
                        d="M25.9185 9.13782H8.58276C8.58553 13.4559 12.0853 16.9557 16.4034 16.9585H19.5968V20.0516C19.6024 24.3697 23.1044 27.8672 27.4225 27.8672V10.6418C27.4225 9.81117 26.7491 9.13782 25.9185 9.13782Z"
                        fill="white"/>
                    <path
                        d="M17.3357 17.7706H0C0 22.0926 3.50366 25.5962 7.82565 25.5962H11.0291V28.6794C11.0319 32.9935 14.5256 36.4917 18.8397 36.5V19.2745C18.8397 18.4439 18.1664 17.7706 17.3357 17.7706Z"
                        fill="white"/>
                </svg>
            </div>
            <div className="text-md font-light pt-4">JIRA Tickets</div>
        </div>

    )
}
export default MetricsJira
