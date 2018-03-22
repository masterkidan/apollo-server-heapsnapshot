
/**
 * Module dependencies.
 */

import { Server } from './server';
import { ApolloEngine } from 'apollo-engine';
/**
 * Get port from environment and store in Express.
 */

let app = new Server().app;
let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

// let server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

const engine = new ApolloEngine(
    {
        apiKey: 'service:masterkidan-2516:rzr83B8z4rEpn571hxhKHg'
    }
);

engine.listen({
    port: port,
    expressApp: app,
    graphqlPaths: ['/graphql', '/graphiql'],
}, onListening);
// server.listen(port);
// server.on('error', onError);
// server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string): string | number {
    let port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return '';
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: ServerError): void {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = '';
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + port;
    console.log('Listening on ' + bind);
}

class ServerError extends Error {
    public syscall: string = '';
    public code: string = '';
}