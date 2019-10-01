// eslint-disable-next-line
const Bundler = require('parcel-bundler');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

(function devMode({ port, options, dev }) {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  });

  const bundler = new Bundler('./src/index.html', { ...options, ...dev });

  bundler.serve(port, false);
})({
  port: 1234,
  options: {
    outDir: './public',
    outFile: 'index.html',
  },
  dev: {
    watch: true,
    hmr: true,
  },
});
