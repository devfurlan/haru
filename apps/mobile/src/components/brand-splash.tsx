import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// Splash brandada (design Claude "Splash Animacao"): o fundo esmeralda ganha
// vida (glow verde/coral), o selo entra com mola e o check se desenha, o
// wordmark sobe e o "ê" estala em coral (o gesto-assinatura), tagline + pontos.
// A janela de boot pode resolver em ~300ms, então o (app)/_layout garante um
// tempo mínimo de tela pra animação rodar inteira e não piscar como bug.
const fraunces = { fontFamily: 'Fraunces_600SemiBold', fontSize: 46, letterSpacing: -1 } as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function Dot({ delay }: { delay: number }) {
  // useState(lazy) em vez de useRef().current: não lê ref durante o render
  // (compatível com o React Compiler ligado neste app). O valor é estável.
  const [opacity] = useState(() => new Animated.Value(0.25));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);
  return <Animated.View style={{ opacity }} className="bg-green-bright h-2 w-2 rounded-full" />;
}

export function BrandSplash() {
  const [glow] = useState(() => new Animated.Value(0));
  const [mark] = useState(() => new Animated.Value(0));
  const [check] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [accentE] = useState(() => new Animated.Value(0));
  const [tag] = useState(() => new Animated.Value(0));
  const [dots] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Cada beat encadeado por delay+duration (mesma receita do design). Tudo em
    // native driver, exceto o check (strokeDashoffset do SVG roda no JS driver).
    const t = (v: Animated.Value, delay: number, duration: number, easing: (n: number) => number, nat = true) =>
      Animated.timing(v, { toValue: 1, delay, duration, easing, useNativeDriver: nat });
    // Beats espaçados de forma mais sequencial (cada elemento ganha seu momento)
    // e durações mais longas: a entrada inteira leva ~3,4s pra dar tempo de ver
    // cada peça chegar. O _layout ainda segura a tela depois pra poder ler.
    const anim = Animated.parallel([
      t(glow, 0, 1000, Easing.out(Easing.cubic)),
      t(mark, 400, 700, Easing.out(Easing.back(1.9))),
      t(check, 950, 600, Easing.out(Easing.cubic), false),
      t(word, 1050, 700, Easing.out(Easing.cubic)),
      t(accentE, 1650, 700, Easing.out(Easing.back(3.2))),
      t(tag, 2250, 750, Easing.out(Easing.cubic)),
      t(dots, 2950, 450, Easing.linear),
    ]);
    anim.start();
    return () => anim.stop();
  }, [glow, mark, check, word, accentE, tag, dots]);

  return (
    <View className="bg-green-deep flex-1">
      <StatusBar style="light" />

      {/* Fundo respira: glows radiais verde (topo) + coral (base) crescem do centro */}
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0"
        style={{ opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }] }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="g" cx="50%" cy="42%" rx="60%" ry="34%">
              <Stop offset="0" stopColor="#2fd37a" stopOpacity={0.26} />
              <Stop offset="1" stopColor="#2fd37a" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="c" cx="50%" cy="80%" rx="62%" ry="38%">
              <Stop offset="0" stopColor="#ff5a36" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#ff5a36" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#c)" />
        </Svg>
      </Animated.View>

      <View className="flex-1 items-center justify-center px-10">
        {/* Selo entra com mola + rotação; o check se desenha */}
        <Animated.View
          style={{
            opacity: mark,
            transform: [
              { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
              { rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) },
            ],
          }}
        >
          {/* halo (ponytail: translúcido sem blur - lê como brilho no fundo escuro) */}
          <View className="absolute -inset-2 rounded-3xl" style={{ backgroundColor: 'rgba(47,211,122,0.18)' }} />
          <View
            className="h-[88px] w-[88px] items-center justify-center rounded-[26px]"
            style={{ backgroundColor: 'rgba(255,253,248,0.06)', borderWidth: 1, borderColor: 'rgba(47,211,122,0.4)' }}
          >
            <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
              <Rect x={3.5} y={4.5} width={17} height={16} rx={3} stroke="#2fd37a" strokeWidth={1.8} />
              <Path d="M3.5 9h17M8 3v4M16 3v4" stroke="#2fd37a" strokeWidth={1.8} strokeLinecap="round" />
              <AnimatedPath
                d="M8.4 13.6l2.2 2.2 4-4.4"
                stroke="#2fd37a"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={12}
                strokeDashoffset={check.interpolate({ inputRange: [0, 1], outputRange: [12, 0] })}
              />
            </Svg>
          </View>
        </Animated.View>

        {/* Wordmark: "Demanda" sobe firme, o "ê" estala em coral por último */}
        <View className="mt-7 flex-row items-baseline">
          <Animated.Text
            allowFontScaling={false}
            style={{
              ...fraunces,
              color: '#faf5ea',
              opacity: word,
              transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
            }}
          >
            Demanda
          </Animated.Text>
          <Animated.Text
            allowFontScaling={false}
            style={{
              ...fraunces,
              color: '#ff5a36',
              opacity: accentE,
              transform: [{ scale: accentE.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
            }}
          >
            ê
          </Animated.Text>
        </View>

        {/* Tagline sobe suave */}
        <Animated.Text
          allowFontScaling={false}
          style={{
            marginTop: 16,
            fontFamily: 'HankenGrotesk_400Regular',
            fontSize: 15,
            color: '#8fbfa4',
            opacity: tag,
            transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          Sua próxima cadeira, num toque.
        </Animated.Text>

        {/* Pontos verdes começam a piscar enquanto o app carrega */}
        <Animated.View style={{ opacity: dots }} className="mt-8 flex-row gap-1.5">
          <Dot delay={0} />
          <Dot delay={200} />
          <Dot delay={400} />
        </Animated.View>
      </View>
    </View>
  );
}
