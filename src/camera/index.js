import cameraStreamModule from './01-stream';
import cameraProcessModule from './02-process';

export default function cameraModule() {
  return [cameraStreamModule, cameraProcessModule];
}
