import type { ReactNode } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { TailStandard } from '@/lib/constants';

// Thin gold line drawings in the style of the app icon: the guppy, a tank and fry.
// They are decoration only, so screen readers skip them; the text next to them says what they are.

type LineIconProps = { size?: number; color?: string };

// Every drawing is on a 48 × 48 grid. The line stays about 1.3pt wide at any size.
function LineSvg({ size = 24, color, children }: LineIconProps & { children: (stroke: StrokeProps) => ReactNode }) {
  const theme = useTheme();
  const px = size >= 40 ? 1.5 : 1.3;
  const stroke: StrokeProps = {
    stroke: color ?? theme.accent,
    strokeWidth: (48 * px) / size,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      {children(stroke)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

// The body, dorsal fin and eye shared by every guppy. The tail joins at (30, 24).
const BODY = 'M5 24 Q9 17.5 19 17.5 Q27 18 31 24 Q27 30 19 30.5 Q9 30.5 5 24 Z';
const DORSAL = 'M17 17.8 Q20 13 26 14.5 Q24 16.5 25 19.3';

// The big fan tail of the app icon, with its three fine rays.
const FAN = { outline: 'M30 24 L45 13 Q47.5 24 45 35 Z', rays: 'M33 23 L43 16.5 M33.5 24 L44.5 24 M33 25 L43 31.5' };

// One simple silhouette per tail standard, on the same body.
const SMALL_ROUND = 'M30 24 Q33 20 37 21 Q39.5 24 37 27 Q33 28 30 24 Z';
const TOP_SWORD = 'M31 23 L46 15.5 L35 21.6 Z';
const BOTTOM_SWORD = 'M31 25 L46 32.5 L35 26.4 Z';

const TAILS: Record<Exclude<TailStandard, 'U'>, { outline: string; rays?: string }> = {
  // Fan: a narrower triangle opening at about 45°.
  A1: { outline: 'M30 24 L44 16.5 Q45.5 24 44 31.5 Z', rays: 'M33.5 24 L42.5 24' },
  // Triangle (delta): wide, with a straight back edge.
  A2: { outline: 'M30 24 L45 12 L45 36 Z', rays: 'M33 23 L44 17 M33.5 24 L44 24 M33 25 L44 31' },
  // Veil: curved top and bottom, dipped-in back edge.
  A3: { outline: 'M30 24 Q37 15 45 13 Q41 24 45 35 Q37 33 30 24 Z', rays: 'M33.5 24 L41 24' },
  // Flag: a long rectangle that barely widens.
  A4: { outline: 'M30 24 L32.5 19.5 L46 18.5 L46 29.5 L32.5 28.5 Z', rays: 'M34 24 L44 24' },
  // Half moon: a full half circle.
  A5: { outline: 'M30 24 L34 12 A12 12 0 0 1 34 36 Z', rays: 'M33 23 L41 15 M33.5 24 L45 24 M33 25 L41 33' },
  // Double sword: a small tail with a sword top and bottom.
  B1: { outline: `${SMALL_ROUND} ${TOP_SWORD} ${BOTTOM_SWORD}` },
  // Top sword.
  B2: { outline: `${SMALL_ROUND} ${TOP_SWORD}` },
  // Bottom sword.
  B3: { outline: `${SMALL_ROUND} ${BOTTOM_SWORD}` },
  // Lyre: two curved swords.
  B4: { outline: `${SMALL_ROUND} M31 23 Q38 16 46 13.5 Q39 18 35.5 22 M31 25 Q38 32 46 34.5 Q39 30 35.5 26` },
  // Spade: parallel edges and a short point.
  C1: { outline: 'M30 24 L33 20 L40 20 L45 24 L40 28 L33 28 Z' },
  // Spear: tapers to a long point.
  C2: { outline: 'M30 24 Q34 18.5 37 19.5 L46 24 L37 28.5 Q34 29.5 30 24 Z' },
  // Round: a small disc.
  C3: { outline: 'M30 24 Q32 18 37 18 A6 6 0 0 1 37 30 Q32 30 30 24 Z' },
  // Pin: a round tail with a thin pin out of the middle.
  C4: { outline: 'M30 24 Q32 19.5 36 19.5 A4.5 4.5 0 0 1 36 28.5 Q32 28.5 30 24 Z M40.5 24 L47 24' },
};

// A guppy. With a tail standard it draws that tail; with none it draws the app icon's fan tail,
// and "Not sure yet" draws that fan tail dotted.
export function LineGuppy({ tail, ...props }: LineIconProps & { tail?: TailStandard | null }) {
  const shape = tail && tail !== 'U' ? TAILS[tail] : FAN;
  return (
    <LineSvg {...props}>
      {(s) => (
        <>
          <Path d={BODY} {...s} />
          <Path d={DORSAL} {...s} />
          <Circle cx={10.5} cy={23} r={1.3} fill={s.stroke} />
          <Path d={shape.outline} {...s} strokeDasharray={tail === 'U' ? '2 3' : undefined} />
          {shape.rays ? <Path d={shape.rays} {...s} strokeWidth={s.strokeWidth * 0.6} /> : null}
        </>
      )}
    </LineSvg>
  );
}

// A tank: glass sides, a water line, gravel, a plant and two bubbles.
export function LineTank(props: LineIconProps) {
  return (
    <LineSvg {...props}>
      {(s) => (
        <>
          <Path d="M5 12 L43 12 M7 12 L7 37 Q7 39 9 39 L39 39 Q41 39 41 37 L41 12" {...s} />
          <Path d="M7 18.5 Q10.5 16.5 14 18.5 T21 18.5 T28 18.5 T35 18.5 T41 18.5" {...s} strokeWidth={s.strokeWidth * 0.7} />
          <Path d="M7 34 L41 34" {...s} strokeWidth={s.strokeWidth * 0.7} />
          <Path d="M15 34 Q12.5 29 15.5 25 M15 34 Q18 30.5 17.5 27" {...s} strokeWidth={s.strokeWidth * 0.7} />
          <Circle cx={31} cy={27} r={1.4} {...s} strokeWidth={s.strokeWidth * 0.7} />
          <Circle cx={33.5} cy={22.5} r={1} {...s} strokeWidth={s.strokeWidth * 0.7} />
        </>
      )}
    </LineSvg>
  );
}

// One tiny fry, drawn around (0, 0) and placed with a translate and scale.
function Fry({ x, y, scale, s }: { x: number; y: number; scale: number; s: StrokeProps }) {
  const line = { ...s, strokeWidth: s.strokeWidth / scale };
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d="M-4 0 Q-4 -2.4 0 -2.4 Q3 -2.2 4.2 0 Q3 2.2 0 2.4 Q-4 2.4 -4 0 Z" {...line} />
      <Path d="M4.2 0 L8 -2.6 L8 2.6 Z" {...line} />
      <Circle cx={-2} cy={-0.4} r={0.7} fill={s.stroke} />
    </G>
  );
}

// A spawn: a little shoal of fry.
export function LineSpawn(props: LineIconProps) {
  return (
    <LineSvg {...props}>
      {(s) => (
        <>
          <Fry x={14} y={15} scale={1.5} s={s} />
          <Fry x={27} y={26} scale={1.9} s={s} />
          <Fry x={12} y={35} scale={1.3} s={s} />
        </>
      )}
    </LineSvg>
  );
}
