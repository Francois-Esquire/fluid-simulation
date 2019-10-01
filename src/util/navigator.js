export function getUserMedia({ video = true, audio = false }) {
  return navigator.mediaDevices
    .getUserMedia({
      video,
      audio,
    })
    .then(stream => {
      return stream;
    })
    .catch(e => {
      console.error(e, e.message);
    });
}
