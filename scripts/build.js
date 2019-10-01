const Bundler = require('parcel-bundler');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

(async function build({ bundle, entry, options }) {
  if (bundle) {
    const bundler = new Bundler(entry, options);
    await bundler.bundle();
  }

  process.exit(0);
})({
  bundle: true,
  entry: ['./src/index.html'],
  options: {
    outDir: './public', // The out directory to put the build files in, defaults to dist
    outFile: 'index.html', // The name of the outputFile
    publicUrl: './', // The url to serve on, defaults to '/'
    cache: true, // Enabled or disables caching, defaults to true
    cacheDir: '.cache', // The directory cache gets put in, defaults to .cache
    contentHash: false, // Disable content hash from being included on the filename
    // global: 'moduleName', // Expose modules as UMD under this name, disabled by default
    minify: true, // Minify files, enabled if process.env.NODE_ENV === 'production'
    scopeHoist: true, // Turn on experimental scope hoisting/tree shaking flag, for smaller production bundles
    target: 'browser', // Browser/node/electron, defaults to browser
    // bundleNodeModules: false, // By default, package.json dependencies are not included when using 'node' or 'electron' with 'target' option above. Set to true to adds them to the bundle, false by default
    logLevel: 3, // 5 = save everything to a file, 4 = like 3, but with timestamps and additionally log http requests to dev server, 3 = log info, warnings & errors, 2 = log warnings & errors, 1 = log errors
    sourceMaps: false, // Enable or disable sourcemaps, defaults to enabled (minified builds currently always create sourcemaps)
    detailedReport: true, // Prints a detailed report of the bundles, assets, filesizes and times, defaults to false, reports are only printed if watch is disabled
    // https: null,
  },
});
