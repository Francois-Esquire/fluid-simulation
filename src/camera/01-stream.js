import { getUserMedia } from '../util';

export default function cameraModule(ctx, app) {
  const video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', 'true');
  video.setAttribute('playsinline', '');
  video.muted = true;

  const texture = ctx.texture2D({
    data: video,
    flipY: true,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.SRGB,
  });

  app.state.camera = {
    loaded: false,
    texture,
  };

  ctx.gl.canvas.addEventListener('click', onClick);

  function onClick() {
    ctx.gl.canvas.removeEventListener('click', onClick);

    const constraints = {
      video: {
        // TODO: handle other situations when 'environment' is not available
        facingMode: 'environment', // assuming mobile
      },
    };

    getUserMedia(constraints)
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

        video.srcObject = stream;

        video.oncanplaythrough = () => {
          app.state.camera.loaded = true;

          // video play is required on iOS
          video.play();
        };
      })
      .catch(e => app.error(e, 'getUserMedia'));
  }

  return function frame() {
    if (app.state.camera.loaded === true) {
      const width = video.videoWidth * app.pixelRatio;
      const height = video.videoHeight * app.pixelRatio;

      ctx.update(texture, {
        data: video,
        width,
        height,
      });
    }
  };
}
