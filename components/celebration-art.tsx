/** Decorative paper-flower composition; no external assets or network requests. */
export default function CelebrationArt() {
  return (
    <svg
      className="celebration-art"
      viewBox="0 0 340 280"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="eventiq-arch"
          x1="180"
          y1="35"
          x2="280"
          y2="260"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F1DDB6" />
          <stop offset="1" stopColor="#B9B881" />
        </linearGradient>
        <linearGradient
          id="eventiq-petal"
          x1="0"
          y1="-70"
          x2="20"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F3BAA0" />
          <stop offset="1" stopColor="#CB7B66" />
        </linearGradient>
        <linearGradient
          id="eventiq-vase"
          x1="90"
          y1="190"
          x2="180"
          y2="260"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E9DCB5" />
          <stop offset="1" stopColor="#AFA673" />
        </linearGradient>
      </defs>
      <ellipse
        cx="194"
        cy="257"
        rx="123"
        ry="11"
        fill="#0C3025"
        opacity=".22"
      />
      <path d="M176 249V100a62 62 0 0 1 124 0v149Z" fill="url(#eventiq-arch)" />
      <path
        d="M190 249V101a48 48 0 0 1 96 0v148M204 249V102a34 34 0 0 1 68 0v147M218 249V103a20 20 0 0 1 40 0v146"
        stroke="#657555"
        strokeOpacity=".3"
      />
      <path
        d="M134 218c-12-42-17-62-16-99M130 193c-6-21-29-27-40-26 2 19 24 30 40 26ZM131 204c2-25 25-40 39-42 3 23-14 43-39 42Z"
        fill="#768F66"
        stroke="#A4B78A"
        strokeWidth="1.3"
      />
      <g transform="translate(118 111)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <ellipse
            key={angle}
            cy="-31"
            rx="19"
            ry="39"
            fill="url(#eventiq-petal)"
            transform={`rotate(${angle})`}
            stroke="#F6C8B2"
            strokeOpacity=".25"
          />
        ))}
        <circle r="18" fill="#F1DBA8" />
        <circle
          r="11"
          stroke="#C39259"
          strokeWidth="1.5"
          strokeDasharray="1 4"
        />
      </g>
      <path d="M91 207h86l-12 47h-62Z" fill="url(#eventiq-vase)" />
      <path
        d="m104 208 8 45m7-45 4 45m11-45v45m15-45-4 45m19-45-8 45"
        stroke="#8B8C61"
        strokeOpacity=".4"
      />
      <ellipse cx="134" cy="207" rx="43" ry="6" fill="#EBDCB4" />
      <circle cx="274" cy="223" r="30" fill="#CF9476" />
      <path
        d="M253 241c13-2 27-19 29-43M260 248c14-9 26-25 27-44"
        stroke="#F4C7A2"
        strokeOpacity=".6"
      />
      <path
        d="m277 20 3 11 11 3-11 3-3 11-3-11-11-3 11-3ZM48 176l3 11 11 3-11 3-3 11-3-11-11-3 11-3Z"
        fill="#E5CD96"
      />
      <circle cx="53" cy="47" r="3" fill="#CF9C77" />
      <circle cx="318" cy="166" r="3" fill="#D8CB9B" />
      <path
        d="m194 16 5 5m111 82 5-5M63 236l5 5"
        stroke="#D4BC8D"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
