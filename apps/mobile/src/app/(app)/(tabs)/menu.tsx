import { maskPhoneBRInput } from '@haru/shared';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const TERMS_URL = 'https://www.demandae.com/termos';
const PRIVACY_URL = 'https://www.demandae.com/privacidade';

import { Text } from '@/components/text';

import { api, ApiError, type Me } from '@/lib/api';
import { signOut } from '@/lib/auth';

const AVATAR_PX = 128; // foto reduzida (quadrada); o círculo exibe ~66px, então 128 cobre retina 2x

const fraunces = { fontFamily: 'Fraunces_500Medium' };
const frauncesSemi = { fontFamily: 'Fraunces_600SemiBold' };

// Ícones das linhas do perfil (contorno esmeralda, copiados do mockup 14).
const ROW_ICON = '#0a3324';

function UserRowIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={ROW_ICON} strokeWidth={2} />
      <Path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" stroke={ROW_ICON} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function LockRowIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={10} width={16} height={11} rx={2.5} stroke={ROW_ICON} strokeWidth={2} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={ROW_ICON} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BellRowIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"
        stroke={ROW_ICON}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={ROW_ICON} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function HeartRowIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.6-7-9.6A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.4C19 15.4 12 20 12 20Z"
        stroke={ROW_ICON}
        strokeWidth={2}
      />
    </Svg>
  );
}

function LoyaltyRowIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 13v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6"
        stroke={ROW_ICON}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={3} y={8} width={18} height={5} rx={1.5} stroke={ROW_ICON} strokeWidth={2} />
      <Path d="M12 8v13" stroke={ROW_ICON} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"
        stroke={ROW_ICON}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HelpRowIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={ROW_ICON} strokeWidth={2} />
      <Path
        d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.7M12 17h.01"
        stroke={ROW_ICON}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke="#c3b79c" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Selo de câmera sobreposto ao avatar - sinaliza que dá pra trocar a foto.
function CameraBadge() {
  return (
    <View className="border-cream bg-green-bright absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full border-2">
      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"
          stroke="#0a3324"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={13} r={3} stroke="#0a3324" strokeWidth={2} />
      </Svg>
    </View>
  );
}

function Row({
  icon,
  label,
  right,
  onPress,
  last,
}: {
  icon?: React.ReactNode;
  label: string;
  right: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3.5 px-1 py-[15px] ${last ? '' : 'border-b border-[#ece3cf]'} ${onPress ? 'active:opacity-60' : ''}`}
    >
      {icon}
      <Text className="text-ink flex-1 text-[15px] font-semibold">{label}</Text>
      {right}
    </Pressable>
  );
}

export default function MenuScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .me()
        .then(setMe)
        .catch(() => {});
    }, []),
  );

  // Escolhe imagem (recorte quadrado), reduz pra 128px jpeg e envia. O servidor
  // apaga a foto anterior do bucket ao trocar.
  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Libere o acesso às suas fotos para escolher uma imagem.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (picked.canceled) return;

    setBusy(true);
    try {
      const ctx = ImageManipulator.manipulate(picked.assets[0].uri);
      ctx.resize({ width: AVATAR_PX, height: AVATAR_PX });
      const rendered = await ctx.renderAsync();
      const out = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.8,
        base64: true,
      });
      if (!out.base64) throw new Error('Falha ao processar a imagem.');
      const { avatarUrl } = await api.uploadAvatar(out.base64);
      setMe((m) => (m ? { ...m, avatarUrl } : m));
    } catch (err) {
      Alert.alert('Ops', err instanceof ApiError ? err.message : 'Não foi possível enviar a foto.');
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    try {
      await api.removeAvatar();
      setMe((m) => (m ? { ...m, avatarUrl: null } : m));
    } catch (err) {
      Alert.alert('Ops', err instanceof ApiError ? err.message : 'Não foi possível remover a foto.');
    } finally {
      setBusy(false);
    }
  }

  function onAvatarPress() {
    if (busy) return;
    if (!me?.avatarUrl) {
      void pickAndUpload();
      return;
    }
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Trocar foto', onPress: () => void pickAndUpload() },
      { text: 'Remover foto', style: 'destructive', onPress: () => void removePhoto() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  const displayName = me?.name || 'Minha conta';
  const initial = (me?.name || me?.email || '?').trim().charAt(0).toUpperCase();
  const subtitle = me?.phone ? maskPhoneBRInput(me.phone) : me?.email || '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView className="bg-cream flex-1" edges={['top']}>
      <View className="px-6 pt-6">
        <Text style={fraunces} className="text-ink text-[28px] tracking-tight">
          Perfil
        </Text>
      </View>

      {/* Identidade */}
      <View className="flex-row items-center gap-[15px] px-6 pt-[18px]">
        <Pressable onPress={onAvatarPress} className="active:opacity-70">
          <View className="bg-green-deep h-[66px] w-[66px] items-center justify-center overflow-hidden rounded-[22px]">
            {me?.avatarUrl ? (
              <Image
                source={{ uri: me.avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Text style={frauncesSemi} className="text-green-bright text-[28px]">
                {initial}
              </Text>
            )}
            {busy ? (
              <View className="absolute inset-0 items-center justify-center bg-black/35">
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </View>
          <CameraBadge />
        </Pressable>
        <View className="flex-1">
          <Text style={frauncesSemi} className="text-ink text-xl" numberOfLines={1}>
            {displayName}
          </Text>
          {subtitle ? (
            <Text className="text-sub mt-0.5 text-[13px]" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Ajustes da conta + seção "Sobre" (transparência) + ações destrutivas. */}
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-12 pt-[22px]">
        <Row
          icon={<UserRowIcon />}
          label="Meus dados"
          right={<ChevronRight />}
          onPress={() => router.push('/perfil/dados' as Href)}
        />
        <Row
          icon={<BellRowIcon />}
          label="Notificações"
          right={<ChevronRight />}
          onPress={() => router.push('/perfil/notificacoes' as Href)}
        />
        <Row
          icon={<HeartRowIcon />}
          label="Favoritos"
          right={<ChevronRight />}
          onPress={() => router.push({ pathname: '/buscar', params: { tab: 'favoritos' } } as Href)}
        />
        <Row
          icon={<LoyaltyRowIcon />}
          label="Fidelidade"
          right={<ChevronRight />}
          onPress={() => router.push('/fidelidade' as Href)}
        />
        <Row
          icon={<LockRowIcon />}
          label="Alterar senha"
          right={<ChevronRight />}
          onPress={() => router.push('/perfil/senha' as Href)}
        />
        <Row
          icon={<HelpRowIcon />}
          label="Ajuda"
          right={<ChevronRight />}
          onPress={() => router.push('/suporte')}
          last
        />

        {/* Sobre / legal */}
        <Text className="text-sub mb-1 mt-7 px-1 text-[12px] font-semibold uppercase tracking-wide">
          Sobre
        </Text>
        <Row label="Termos de Uso" right={<ChevronRight />} onPress={() => Linking.openURL(TERMS_URL)} />
        <Row
          label="Política de Privacidade"
          right={<ChevronRight />}
          onPress={() => Linking.openURL(PRIVACY_URL)}
          last
        />

        {/* Ações da conta (excluir conta vive dentro de "Meus dados"). */}
        <View className="mt-7">
          <Pressable onPress={() => signOut()} className="self-start px-1 py-2 active:opacity-60">
            <Text className="text-coral text-sm font-bold">Sair</Text>
          </Pressable>
        </View>

        <Text className="text-sub mt-6 px-1 text-[11px] opacity-70">Versão {version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
