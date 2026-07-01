import Svg, { Circle, Line, Path } from 'react-native-svg';

// Olho (mostrar) / olho cortado (ocultar) - estilo Lucide/Feather.
export function EyeIcon({
  off = false,
  size = 22,
  color = '#51635a',
}: {
  off?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx="12" cy="12" r="3" />
      {off ? <Line x1="3" y1="3" x2="21" y2="21" /> : null}
    </Svg>
  );
}
