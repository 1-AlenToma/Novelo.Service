const path = require('path');
const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
    name: 'NoveloService',
    description: 'Database Service For Novelo App',
    script: path.join(__dirname, 'server.js'),
    wait: 2,
    grow: 0.5,
    maxRestarts: 40,
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: [
        {
            name: '__SERVICE_MODE__',
            value: '1'
        }
    ]
});

// Listen for the "install" event
svc.on('install', () => {
    console.log('Service installed successfully!');
    svc.start();
});

// Listen for "alreadyinstalled"
svc.on('alreadyinstalled', () => {
    svc.start()
    console.log('Service is already installed.');
});

// Listen for the "start" event
svc.on('start', () => {
    console.log('Service started successfully!');
});

// Install the service
svc.install();
