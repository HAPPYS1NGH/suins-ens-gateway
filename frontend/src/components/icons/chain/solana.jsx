export const ChainSolanaIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <circle cx={16} cy={16} r={16} fill="#000" />
    <g clipPath="url(#chain_solana_svg__a)">
      <path
        fill="url(#chain_solana_svg__b)"
        d="m23.918 20.256-2.642 2.79a.62.62 0 0 1-.448.192H8.307a.31.31 0 0 1-.282-.182.3.3 0 0 1 .057-.326l2.644-2.79a.61.61 0 0 1 .447-.192h12.52a.31.31 0 0 1 .282.181.3.3 0 0 1-.057.327m-2.642-5.619a.61.61 0 0 0-.448-.192H8.307a.31.31 0 0 0-.282.182.3.3 0 0 0 .057.326l2.644 2.79a.61.61 0 0 0 .447.193h12.52a.31.31 0 0 0 .282-.182.3.3 0 0 0-.057-.327zm-12.97-2.004h12.522a.62.62 0 0 0 .448-.192l2.642-2.79a.3.3 0 0 0 .057-.327.31.31 0 0 0-.282-.181h-12.52a.62.62 0 0 0-.447.192l-2.643 2.79a.3.3 0 0 0 .056.458.3.3 0 0 0 .168.05"
      />
    </g>
    <defs>
      <linearGradient
        id="chain_solana_svg__b"
        x1={9.351}
        x2={22.259}
        y1={23.574}
        y2={8.801}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0.08} stopColor="#9945FF" />
        <stop offset={0.3} stopColor="#8752F3" />
        <stop offset={0.5} stopColor="#5497D5" />
        <stop offset={0.6} stopColor="#43B4CA" />
        <stop offset={0.72} stopColor="#28E0B9" />
        <stop offset={0.97} stopColor="#19FB9B" />
      </linearGradient>
      <clipPath id="chain_solana_svg__a">
        <path fill="#fff" d="M8 9.143h16v14.095H8z" />
      </clipPath>
    </defs>
  </svg>
);