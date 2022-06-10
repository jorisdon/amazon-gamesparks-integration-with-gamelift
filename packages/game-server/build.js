const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const FILENAME = 'game-server.zip';

const out = fs.createWriteStream(__dirname + path.sep + FILENAME);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

out.on('close', function() {
  console.log(`Done writing ${FILENAME}!`);
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(out);

archive.file('index.js', { name: 'index.js'});
archive.file('gameloop.js', { name: 'gameloop.js'});

archive.finalize();