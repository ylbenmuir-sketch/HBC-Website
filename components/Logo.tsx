export function LogoMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19" stroke="#A9853F" strokeWidth="1" />
      <path
        d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20"
        stroke="#8FA08D"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoName({ color }: { color?: string }) {
  return (
    <div className="logo-name" style={color ? { color } : undefined}>
      Harmonized<span>Brain Centers</span>
    </div>
  );
}
