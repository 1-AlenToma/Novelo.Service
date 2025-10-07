const path = require('path');
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'NoveloService',
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully!');
});

svc.uninstall();
