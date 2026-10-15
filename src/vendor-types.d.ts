// Upstream ships this ambient declaration outside its exported source tree.
declare module 'color-name' {
  const colors: Record<string, [number, number, number]>;
  export default colors;
}
