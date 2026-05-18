export const FlaskIcon = () => (
  <svg className="w-full h-full drop-shadow-[0_0_12px_rgba(0,255,65,0.5)]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 11.5L4.5 17.5C4.2 18.1 4.5 19 5.2 19H18.8C19.5 19 19.8 18.1 19.5 17.5L16.5 11.5" fill="#00FF41" fillOpacity="0.1"></path>
    <path d="M7.5 11.5L4.5 17.5C4.2 18.1 4.5 19 5.2 19H18.8C19.5 19 19.8 18.1 19.5 17.5L16.5 11.5H7.5Z" fill="url(#liquid-gradient)" fillOpacity="0.6"></path>
    <path d="M9.5 3H14.5M10.5 3V8.5L5.2 18.2C4.6 19.3 5.4 20.5 6.6 20.5H17.4C18.6 20.5 19.4 19.3 18.8 18.2L13.5 8.5V3H10.5Z" stroke="#00FF41" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
    <path d="M10.5 6H13.5" stroke="#00FF41" strokeOpacity="0.5" strokeWidth="1"></path>
    <circle className="animate-bounce" cx="10" cy="15.5" fill="#00FF41" r="0.8" style={{ animationDuration: '3s' }}></circle>
    <circle className="animate-bounce" cx="13" cy="17.5" fill="#00FF41" r="0.6" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></circle>
    <circle className="animate-pulse" cx="11.5" cy="13" fill="#00FF41" r="0.4"></circle>
    <defs>
      <linearGradient gradientUnits="userSpaceOnUse" id="liquid-gradient" x1="12" x2="12" y1="11.5" y2="19">
        <stop stopColor="#00FF41" stopOpacity="0.4"></stop>
        <stop offset="1" stopColor="#000000" stopOpacity="0.1"></stop>
      </linearGradient>
    </defs>
  </svg>
);