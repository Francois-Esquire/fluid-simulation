import { getUserMedia } from '../util';
import { quad } from '../shapes';

// import cameraStreamModule from './01-stream';
import renderModule from './01-render';
import cameraGrayScalePass from './02-grayscale';
// import cameraProcessModule from './02-process';
import scaleSpacePass from './03-scale-space';
import FASTPass from './03-fast';

function sketch() {
  const PI = 333.0 / 106.0;
  const TWOPI = 2 * PI;
  const iterations = 16;
  const piUnit = TWOPI / iterations;

  const radius = 4;

  for (let i = 0.0; i < iterations; i += 1.0) {
    const x = Math.sin(i * piUnit);
    const y = Math.cos(i * piUnit);
    console.log(`i ${i} - \n cos (X) ${x}, sin (Y) ${y}`);
    console.log(`vector(x,y) - (${x * radius}, ${y * radius})`);
    console.log(
      `vector(x,y) - (${Math.floor(x * radius)}, ${Math.floor(y * radius)})`,
    );
  }
}

function initialize({ app, canvas, video, parameters }, onReady = null) {
  sketch();

  canvas.addEventListener('click', onClick);
  function onClick() {
    canvas.removeEventListener('click', onClick);

    getUserMedia(parameters.constraints)
      .then(stream => {
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();

        const width = capabilities.width.max;
        const height = capabilities.height.max;
        videoTrack.applyConstraints({
          video: {
            width,
            height,
          },
        });

        if (typeof onReady === 'function')
          onReady({ stream, videoTrack, width, height });
      })
      .catch(e => app.error(e, 'getUserMedia'));
  }
}

function createVideoElement({ width = 128, height = 128 } = {}) {
  const video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', 'true');
  video.setAttribute('playsinline', '');
  video.muted = true;

  video.width = width;
  video.height = height;

  return video;
}

export default function cameraModule(ctx, app) {
  const parameters = {
    constraints: {
      video: {
        // TODO: handle other situations when 'environment' is not available
        facingMode: 'environment', // assuming mobile
      },
    },
  };

  const video = createVideoElement();

  const videoTextureOptions = {
    flipY: true,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  const processTextureOptions = {
    width: app.width,
    height: app.height,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  };

  const [textureFloat] = ['OES_texture_float', 'OES_standard_derivatives'].map(
    extName => {
      const ext = ctx.gl.getExtension(extName);
      if (!ext) {
        console.warn(`${extName} is not supported`);
        return false;
      }
      return true;
    },
  );

  if (textureFloat) {
    videoTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
    processTextureOptions.pixelFormat = ctx.PixelFormat.RGBA32F;
  }

  function swap(texture1, texture2) {
    const temp = textures[texture1];
    textures[texture1] = textures[texture2];
    textures[texture2] = temp;
  }

  const textures = {
    video: null,
    process1: ctx.texture2D(processTextureOptions),
    process2: ctx.texture2D(processTextureOptions),
  };

  const { positions, texCoords, faces } = quad;
  app.state.camera = {
    textures,
    swap,
    video,
    parameters,
    attributes: {
      aPosition: ctx.vertexBuffer(positions),
      aTexCoord: ctx.vertexBuffer(texCoords),
    },
    indices: ctx.indexBuffer(faces),
  };

  const passes = [];

  // add these passes after video starts

  function OOstreamPass() {
    const width = video.videoWidth * app.pixelRatio;
    const height = video.videoHeight * app.pixelRatio;

    ctx.update(textures.video, {
      data: video,
      width,
      height,
    });
  }

  let stream = null;

  initialize(
    { app, canvas: ctx.gl.canvas, video, parameters },
    ({ stream, videoTrack, width, height }) => {
      video.srcObject = stream;
      // video play is required on iOS
      video.play();

      video.oncanplaythrough = () => {
        stream = stream;
        // pass in rendering passes with the video
        textures.video = ctx.texture2D({
          ...videoTextureOptions,
          width,
          height,
          data: video,
        });

        [
          renderModule,
          cameraGrayScalePass,
          FASTPass,
          // scaleSpacePass,
        ]
          .map(mod => mod(ctx, app))
          .forEach(renderer => passes.push(renderer));
        passes.unshift(OOstreamPass);
      };
    },
  );

  function cleanup() {
    // stop video
    video.srcObject = null;
    // release the stream
    stream.stop();
    // remove element
    // dispose of resources
  }

  return function renderer() {
    passes.forEach(pass => pass());

    return cleanup;
  };
}
