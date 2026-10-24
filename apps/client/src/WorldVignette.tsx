/** Lightweight original scenery: no downloaded artwork or texture payloads. */
export function WorldVignette({ world }: { world: number }) {
  return (
    <svg
      className={`world-vignette vignette-${world}`}
      viewBox="0 0 480 400"
      fill="none"
    >
      <defs>
        <linearGradient
          id={`veil-${world}`}
          x1="240"
          y1="30"
          x2="240"
          y2="390"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity=".2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {world === 0 && (
        <>
          {[65, 145, 305, 385].map((x, i) => (
            <g
              key={x}
              className={i % 2 ? "shelf left-shelf" : "shelf right-shelf"}
            >
              <path
                d={`M${x} 100v240h45V100z`}
                fill={`url(#veil-${world})`}
                stroke="currentColor"
                opacity=".65"
              />
              {[150, 205, 260, 315].map((y) => (
                <g key={y}>
                  <path d={`M${x} ${y}h45`} stroke="currentColor" />
                  {[8, 17, 28, 36].map((dx) => (
                    <path
                      key={dx}
                      d={`M${x + dx} ${y - 30}v27`}
                      stroke="currentColor"
                      opacity=".5"
                    />
                  ))}
                </g>
              ))}
            </g>
          ))}
          <g className="vignette-clock">
            <circle cx="240" cy="160" r="64" stroke="currentColor" />
            <circle
              cx="240"
              cy="160"
              r="52"
              stroke="currentColor"
              strokeDasharray="2 11"
              strokeWidth="6"
            />
            <path d="M240 112v48l30 17" stroke="currentColor" strokeWidth="2" />
          </g>
          <path
            d="M110 355l130-72 130 72M165 355l75-42 75 42"
            stroke="currentColor"
            opacity=".3"
          />
        </>
      )}
      {world === 1 && (
        <>
          <ellipse
            cx="240"
            cy="190"
            rx="160"
            ry="55"
            transform="rotate(-25 240 190)"
            stroke="currentColor"
            opacity=".6"
          />
          <ellipse
            cx="240"
            cy="190"
            rx="130"
            ry="100"
            transform="rotate(40 240 190)"
            stroke="currentColor"
            opacity=".4"
          />
          <circle
            cx="240"
            cy="190"
            r="62"
            fill={`url(#veil-${world})`}
            stroke="currentColor"
          />
          <g className="celestial-body">
            <circle
              cx="350"
              cy="100"
              r="18"
              fill="#151c2c"
              stroke="currentColor"
            />
            <path
              d="M115 245l20-12 24 8-4 20-25 7zM296 306l16-21 30 8 6 20-35 8z"
              fill="#151c2c"
              stroke="currentColor"
            />
          </g>
          <path
            d="M240 252v70M192 337l48-15 48 15M205 345h70"
            stroke="currentColor"
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path
              key={i}
              d={`M${70 + i * 48} ${50 + ((i * 53) % 230)}v8m-4-4h8`}
              stroke="currentColor"
              opacity=".6"
            />
          ))}
        </>
      )}
      {world === 2 && (
        <>
          {[110, 200, 290].map((x) => (
            <g key={x}>
              <path
                d={`M${x} 315V180a40 40 0 0180 0v135`}
                stroke="currentColor"
                strokeWidth="4"
                opacity=".65"
              />
              <path
                d={`M${x + 10} 315V180a30 30 0 0160 0v135`}
                stroke="currentColor"
                opacity=".3"
              />
            </g>
          ))}
          <path
            d="M70 325q170-35 340 0M70 342q170-35 340 0"
            stroke="currentColor"
            opacity=".4"
          />
          <g className="water-rays" stroke="currentColor" opacity=".15">
            <path
              d="M145 30l-60 285M245 20L195 310M345 20l-30 290"
              strokeWidth="16"
            />
          </g>
          <g className="water-bubbles">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <circle
                key={i}
                cx={80 + i * 45}
                cy={80 + ((i * 43) % 220)}
                r={3 + (i % 4)}
                stroke="currentColor"
                opacity=".6"
              />
            ))}
          </g>
        </>
      )}
      {world === 3 && (
        <>
          <path
            d="M85 325h310M85 338h310M115 110v210M365 110v210M115 110h250"
            stroke="currentColor"
            opacity=".6"
          />
          <path
            d="M200 160v-28h80v28l-10 30h-60z"
            fill={`url(#veil-${world})`}
            stroke="currentColor"
          />
          <g className="magnetic-carriage">
            <path
              d="M175 270h130v30H175zM195 250h90v20h-90z"
              fill="#151c2c"
              stroke="currentColor"
            />
            <circle cx="195" cy="312" r="9" stroke="currentColor" />
            <circle cx="285" cy="312" r="9" stroke="currentColor" />
          </g>
          <g className="field-arcs" stroke="currentColor">
            <path d="M220 195l-15 25 20-8-10 24M260 195l15 25-20-8 10 24" />
            <ellipse cx="240" cy="230" rx="90" ry="18" opacity=".35" />
            <ellipse cx="240" cy="230" rx="120" ry="30" opacity=".2" />
          </g>
          <path d="M70 350l45-12M410 350l-45-12" stroke="currentColor" />
        </>
      )}
      {world === 4 && (
        <>
          <path
            d="M65 65l145 95h60L415 65v290L270 270h-60L65 355z"
            fill={`url(#veil-${world})`}
            stroke="currentColor"
            opacity=".4"
          />
          <path
            d="M210 160v110M270 160v110M65 65h350M65 355h350"
            stroke="currentColor"
            opacity=".4"
          />
          <g className="manor-wall">
            <path
              d="M110 100v220l58-34V138z"
              fill="#151c2c"
              stroke="currentColor"
            />
            <path
              d="M122 142v90l30-8v-65z"
              stroke="currentColor"
              opacity=".6"
            />
          </g>
          <g className="manor-wall reverse">
            <path
              d="M370 100v220l-58-34V138z"
              fill="#151c2c"
              stroke="currentColor"
            />
            <path
              d="M358 142v90l-30-8v-65z"
              stroke="currentColor"
              opacity=".6"
            />
          </g>
          <path d="M225 270v-61a15 15 0 0130 0v61" stroke="currentColor" />
          <g className="candle-flame">
            <path d="M240 250q-10-15 0-22 10 7 0 22" fill="currentColor" />
          </g>
          <path d="M240 252v20m-8 2h16" stroke="currentColor" />
        </>
      )}
      {world === 5 && (
        <>
          <g className="garden-path">
            <path
              d="M70 265l90-28 60 24-90 30zM270 170l75-23 60 24-75 25zM175 105l65-20 50 20-65 22z"
              fill={`url(#veil-${world})`}
              stroke="currentColor"
            />
            <path
              d="M70 265l60 46 90-50M270 170l60 40 75-39M175 105l50 38 65-38"
              stroke="currentColor"
              opacity=".3"
            />
            <path
              d="M120 250q-20-35-12-52m9 40-18-10m18 0 13-18M345 155q12-40 0-55m5 36 16-16m-16 6-16-10"
              stroke="currentColor"
            />
          </g>
          <g className="wind-trails" stroke="currentColor" opacity=".5">
            <path d="M60 140q70-35 130 0t130 0M160 230q70-35 130 0t130 0M80 330q100-35 200 0" />
          </g>
          <g className="garden-leaves" fill="currentColor">
            <path d="M110 180q22-10 18 5-15 10-18-5M360 285q22-10 18 5-15 10-18-5M240 55q22-10 18 5-15 10-18-5" />
          </g>
        </>
      )}
    </svg>
  );
}
