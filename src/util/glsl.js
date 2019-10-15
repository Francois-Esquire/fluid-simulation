export function glsl(str, ...args) {
  const string = [];

  str.forEach((sub, i) => {
    string.push(sub, args[i]);
  });

  return string.join('').trim();
}
