// Metro configurado para o monorepo pnpm + Turborepo.
// Sem isto, o Metro não acha os pacotes do workspace (@haru/shared) nem as deps
// hoistadas na raiz - é a causa nº 1 de "unable to resolve module" em Expo+monorepo.
// getSentryExpoConfig = getDefaultConfig + geração/upload de sourcemap do Sentry.
// Ele produz o config base; o NativeWind envolve por fora (ver final do arquivo).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getSentryExpoConfig(projectRoot);

// 1. Observa o monorepo inteiro (pra ver mudanças em packages/shared).
config.watchFolders = [monorepoRoot];

// 2. Resolve módulos tanto do app quanto da raiz (hoisting do pnpm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. NUNCA empacota código server-only no bundle mobile. Um import acidental de
//    Prisma/@haru/database falha alto aqui em vez de inchar (ou quebrar) o bundle.
config.resolver.blockList = [
  /\/packages\/database\/.*/,
  /\/node_modules\/@prisma\/.*/,
  /\/node_modules\/\.prisma\/.*/,
  /\/node_modules\/@haru\/database\/.*/,
];

// NativeWind processa o CSS (Tailwind) e habilita className nos componentes RN.
module.exports = withNativeWind(config, { input: './src/global.css' });
