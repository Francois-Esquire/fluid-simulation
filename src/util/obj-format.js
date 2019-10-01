export function formatOBJ(geometry) {
  console.log(geometry);

  return ``;
}

export function exportToOBJ(geometry) {
  const formattedGeometry = formatOBJ(geometry);

  return {
    obj: formattedGeometry,
    mtl: null,
  }
}