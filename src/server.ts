import * as express from 'express';
import * as bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { typeDefs } from './graph-ql-schema';
import { Parser } from './graph-ql-resolvers';
class HttpError extends Error {
    status: number = 0;
}



export class Server {
    // Initialize the app
    public app: express.Express;
    private parser: Parser;

    constructor() {
        this.app = express();
        this.parser = new Parser();
        this.parser.loadSnapshot("C:\Users\mukav\Downloads\Heap-20180321T181425.heapsnapshot");
        let resolvers = this.parser.resolvers();
        // Put together a schema
        const schema = makeExecutableSchema({
            typeDefs,
            resolvers
        });
        // The GraphQL endpoint
        this.app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

        // GraphiQL, a visual editor for queries
        this.app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

        // catch 404 and forward to error handler
        this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            let err = new HttpError('Not Found');
            err.status = 404;
            next(err);
        });

        // error handlers

        // development error handler
        // will print stacktrace
        if (this.app.get('env') === 'development') {
            this.app.use((err: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
                res.status(err.status || 500);
                res.render('error', {
                    message: err.message,
                    error: err
                });
            });
        }

        // production error handler
        // no stacktraces leaked to user
        this.app.use((err: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: {}
            });
        });
    }
}
