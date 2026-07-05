import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// Splash brandada (design Claude "Splash Animacao"). A marca é a bolinha laranja de
// notificação (do logo Demandaê) com pulse animado, centralizada. O fundo respira
// (glow verde/coral), o wordmark "Demanda" sobe claro e o "ê" estala em coral (o
// gesto-assinatura), tagline + pontos. O texto pende por baixo da marca (absoluto),
// pra a marca não sair do centro. O (app)/_layout segura a tela até o conteúdo carregar.
// NOTA: o splash NATIVO (app.json) ainda usa splash-seal.png (calendário); trocar por
// uma arte da bolinha laranja pra o handoff nativo->animado não pular.
const fraunces = { fontFamily: 'Fraunces_600SemiBold', fontSize: 46, letterSpacing: -1 } as const;
// Diâmetro da bolinha de notificação (a marca). Casa com o logo (dot de 59px no SVG).
const BADGE = 60;

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

// Anel do pulse de notificação: cresce e some em loop (o "efeito pulse" que no SVG do
// logo era simulado por 2 círculos estáticos). Native driver (scale + opacity).
function PulseRing({ delay, size }: { delay: number; size: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1900,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FF5A18',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.85] }) }],
      }}
    />
  );
}

export function BrandSplash({ overlay = false }: { overlay?: boolean }) {
  const [glow] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [accentE] = useState(() => new Animated.Value(0));
  const [tag] = useState(() => new Animated.Value(0));
  const [dots] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Cada beat encadeado por delay+duration (tudo em native driver). O selo já está
    // presente desde o frame 0 (casa com o nativo), então o nome começa a entrar logo.
    const t = (v: Animated.Value, delay: number, duration: number, easing: (n: number) => number) =>
      Animated.timing(v, { toValue: 1, delay, duration, easing, useNativeDriver: true });
    const anim = Animated.parallel([
      t(glow, 0, 1000, Easing.out(Easing.cubic)),
      t(word, 300, 700, Easing.out(Easing.cubic)),
      t(accentE, 900, 700, Easing.out(Easing.back(3.2))),
      t(tag, 1500, 750, Easing.out(Easing.cubic)),
      t(dots, 2200, 450, Easing.linear),
    ]);
    anim.start();
    return () => anim.stop();
  }, [glow, word, accentE, tag, dots]);

  return (
    // overlay: fica por cima do Stack da home (mesmo fundo esmeralda) até o conteúdo
    // carregar por baixo, então some direto pro conteúdo.
    <View
      className="bg-green-deep flex-1"
      style={overlay ? [StyleSheet.absoluteFill, { zIndex: 20 }] : undefined}
    >
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

      {/* Marca centralizada na tela; o texto é absoluto (pende por baixo), então só a
          marca fica no fluxo e trava no centro exato da tela. */}
      <View className="flex-1 items-center justify-center">
        {/* Camada de largura total: a marca (no fluxo) define a altura e trava no centro
            exato da tela; o texto pende absoluto por baixo, centrado pela largura total
            - sem transform % (que é frágil no RN). */}
        <View className="w-full items-center">
          {/* Marca: bolinha laranja de notificação com pulse animado. No SVG do logo o
              pulse era simulado por 2 círculos estáticos; aqui a base sólida fica parada
              e os anéis crescem/somem em loop. */}
          <View className="items-center justify-center" style={{ width: BADGE, height: BADGE }}>
            <PulseRing delay={0} size={BADGE} />
            <PulseRing delay={950} size={BADGE} />
            <View style={{ width: BADGE, height: BADGE, borderRadius: BADGE / 2, backgroundColor: '#FF5A18' }} />
          </View>

          {/* Texto pende por baixo do selo: camada de largura total (inset-x-0) centrada
              por items-center. NÃO usar left:50% + translateX:-50% - percentual em transform
              não aplica de forma confiável no RN e jogava o texto pra direita, cortado. */}
          <View className="absolute inset-x-0 items-center px-10" style={{ top: '100%' }}>
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

            {/* Pontos verdes piscam enquanto o app carrega */}
            <Animated.View style={{ opacity: dots }} className="mt-8 flex-row gap-1.5">
              <Dot delay={0} />
              <Dot delay={200} />
              <Dot delay={400} />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}
