const path = require('path');
const fs = require("fs");
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'NoveloService',
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully!');
  const folderPath = path.join(__dirname, 'daemon');

  fs.rm(folderPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error('Failed to delete folder:', err);
    } else {
      console.log('Folder deleted successfully!');
    }
  });
});

svc.uninstall();
