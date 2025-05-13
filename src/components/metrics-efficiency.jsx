function MetricsEfficiency({ efficiency }) {
  return (
    <div className="bg-teal-900 drop-shadow-sky-700 drop-shadow-lg text-white p-2">
      <div className="text-2xl font-light">{efficiency} %</div>
      <div className="absolute right-3 top-2">
        <svg
          width="37"
          height="37"
          viewBox="0 0 37 37"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_576_2036)">
            <path
              d="M36.2667 18.5C36.2667 22.8829 34.6676 27.1152 31.7692 30.403C28.8709 33.6908 24.8726 35.8082 20.5243 36.3579C16.176 36.9076 11.7765 35.8519 8.15117 33.3888C4.52583 30.9257 1.92373 27.2245 0.833007 22.9795C-0.257718 18.7344 0.237878 14.2373 2.22683 10.3317C4.21577 6.42603 7.5614 3.38028 11.6361 1.76576C15.7108 0.151235 20.2346 0.0788879 24.3588 1.56229C28.4831 3.04569 31.9244 5.9829 34.0372 9.82294L27.729 13.2938C26.4613 10.9897 24.3965 9.22741 21.922 8.33737C19.4474 7.44733 16.7332 7.49074 14.2884 8.45945C11.8435 9.42817 9.83615 11.2556 8.64279 13.599C7.44942 15.9424 7.15206 18.6407 7.80649 21.1877C8.46093 23.7347 10.0222 25.9554 12.1974 27.4333C14.3726 28.9111 17.0123 29.5445 19.6213 29.2147C22.2302 28.8849 24.6292 27.6145 26.3682 25.6418C28.1072 23.6691 29.0667 21.1297 29.0667 18.5H36.2667Z"
              fill="white"
            />
          </g>
          <defs>
            <clipPath id="clip0_576_2036">
              <rect
                width="36"
                height="36"
                fill="white"
                transform="translate(0.266724 0.5)"
              />
            </clipPath>
          </defs>
        </svg>
      </div>
      <div className="text-md font-light pt-4">
        On-sky open-shutter efficiency
      </div>
    </div>
  );
}

export default MetricsEfficiency;
