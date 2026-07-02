import Svg, { Path } from 'react-native-svg';

// Coração de favoritar. `filled` alterna entre contorno (não favoritado) e cheio.
export function HeartIcon({
  size = 24,
  color = '#ff5a36',
  filled = false,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? color : '#c3b79c'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 20.5 4.2 12.9a4.6 4.6 0 0 1 0-6.6 4.7 4.7 0 0 1 6.6 0l1.2 1.2 1.2-1.2a4.7 4.7 0 0 1 6.6 0 4.6 4.6 0 0 1 0 6.6z" />
    </Svg>
  );
}
