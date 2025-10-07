// SSE connections
let clients = [];
let logs = [];
const MAX_LOGS = 500;

// helper to broadcast log messages
function broadcastLog({ type, message }) {
    const payload = JSON.stringify({ type, message });
    clients.forEach(c => c.write(`data: ${payload}\n\n`));
}

function getTimeStamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0"); // months 0-11
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}.${mm}-${dd}:${hh}:${min}:${sec}`;
}

const patchConsole = (...funcs) => {
    const colors = {
        log: "\x1b[32m",
        info: "\x1b[36m",
        error: "\x1b[31m",
        reset: "\x1b[0m"
    };


    const toString = (item) => {
        if (typeof item === "object")
            return JSON.stringify(item, undefined, 4);

        return item;
    }

    funcs.forEach(type => {
        const original = console[type];
        console[type] = (...args) => {
            const message = `[${getTimeStamp()}] ${args.map(x => toString(x)).join(" ")}`;

            // Node console with color
            original(`${colors[type] || colors.log}${message}${colors.reset}`);

            // Save to logs
            logs.push({ type, message });
            if (logs.length > MAX_LOGS) logs.shift();

            // Broadcast to SSE clients (send type as well)
            broadcastLog({ type, message });
        };
    });
};


module.exports = {
    patch: patchConsole,
    clients,
    logs,
    broadcastLog
};