// Declara imports de CSS (usados pelo suporte web do Expo) para o TypeScript.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
