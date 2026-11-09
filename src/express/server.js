const patchConsole = require("./consolePatcher");
patchConsole.patch("log", "error", "info");
const { loadChromium } = require("./htmlService");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const dbHandler = require("./sqliteHandler");
const Service = require("node-windows").Service;
const fs = require("fs");
const os = require('os');
const Base64 = require("js-base64");
const fetch = require('node-fetch');
let server;
const connections = new Set();
const configPath = path.join(__dirname, "config.json");
let svc;
const getService = () => {
    return (svc = svc ?? (svc = new Service({
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
    })));
}

// Function to get public IP
async function getPublicIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (err) {
        console.error('Could not fetch public IP:', err);
        return 'unknown';
    }
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // fallback
}

// Default config
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ port: 8080 }, null, 2));
}

let config = JSON.parse(fs.readFileSync(configPath));

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// Install service
app.post("/service/install", (req, res) => {
    // Check if already installed
    if (getService().exists) {
        return res.json({ message: "Service already installed" });
    }

    // Respond immediately, then install in background
    console.info({ message: "Installing service..." });

    // Use once to avoid multiple event triggers
    getService().once("install", () => {
        console.log("Service installed and started");
        res.json({ message: "Service installed and started" });
    });
    getService().once("alreadyinstalled", () => {
        console.log("Service already installed");
        res.json({ message: "Service already installed" });
    });
    getService().once("error", (err) => {
        console.error("Service install error:", err);
        res.json({ message: "Error" });
    });

    getService().install();
});

// Uninstall service
app.post("/service/uninstall", (req, res) => {

    // Respond immediately
    console.info({ message: "Uninstalling service..." });

    getService().once("uninstall", () => {
        console.log("Service uninstalled");
        res.json({ message: "Service uninstalled..." });
    });
    getService().once("error", (err) => {
        console.error("Service uninstall error:", err);
        res.json({ message: "Error..." });
    });

    getService().uninstall();
});

app.get("/logs", (req, res) => {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.flushHeaders();
    patchConsole.clients.push(res);

    // Send all existing logs first
    patchConsole.logs.forEach(log => {
        // Each log is an object: { type, message }
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    });



    req.on("close", () => {
        const index = patchConsole.clients.indexOf(res);
        if (index !== -1) {
            patchConsole.clients.splice(index, 1);
        }
    });
});



function safeRestart(port) {
    if (process.env.__SERVICE_MODE__ === "1") {
        // running under a service manager
        console.log("Is a service, restart service")
        setTimeout(() => process.exit(0), 1000);
    } else {
        restartServer(port); // restart internally
    }
}

function startServer(port) {
    server = app.listen(port, () => {
        console.log(`✅ Express service running at http://${getLocalIP()}:${port}`);
    });

    server.on("connection", (conn) => {
        connections.add(conn);
        conn.on("close", () => connections.delete(conn));
    });
}

function restartServer(newPort) {
    try {
        if (server) {
            console.log("🛑 Closing current server...");
            // Destroy all active connections
            connections.forEach((conn) => conn.destroy());
            server.close(() => {
                console.log("✅ Server closed. Restarting...");
                config.port = newPort;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                startServer(newPort);
            });
        } else {
            startServer(newPort);
        }
    } catch (e) {
        console.error(e);
    }
}

// Example endpoint
app.get('/ping', (req, res) => {
    res.status(200).send(true);
});

app.get("/port", async (req, res) => {
    res.json({ port: config.port, host: getLocalIP(), pHost: await getPublicIP() });
});

// --- API: Update port ---
app.post("/port", (req, res) => {
    const { port } = req.body;
    if (!port || isNaN(port)) {
        return res.status(400).json({ error: "Invalid port number" });
    }
    config.port = port;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    res.json({ message: `Port updated to ${port}. Restarting server...` });
    console.log(`🔄 Restarting server on port ${port}...`);
    setTimeout(() => safeRestart(port), 1000);
});

// Example API route
app.post('/sql', async (req, res) => {
    const { sql, args, operation } = req.body;
    try {
        let decodedArgs = JSON.parse(Base64.decode(args, 'base64'))
        let value = await dbHandler.executeSql(sql, decodedArgs, operation);
        res.status(200).json(value);
    } catch (e) {
        res.json({ message: `Error: ${e}` });
        console.error(e.message);
    }
    // res.json({ message: 'Hello from Windows service!' });
});


// --- Default route ---
app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/settings", (req, res) => {
    res.json({ process: process.env.__SERVICE_MODE__ ?? 0 });
});

app.post("/settings", (req, res) => {
    const settings = req.body;
    dbHandler.settings(settings);
});

loadChromium(app);

// --- Start server ---
restartServer(config.port);