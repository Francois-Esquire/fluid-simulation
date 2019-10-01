const quadPositions = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const quadTexCoords = [[0, 0], [1, 0], [1, 1], [0, 1]];
const quadFaces = [[0, 1, 2], [0, 2, 3]];
const quadNormals = [[0, 0, 1], [0, 0, 1]];

export default {
  positions: quadPositions,
  texCoords: quadTexCoords,
  faces: quadFaces,
  normals: quadNormals,
};
