import * as express from 'express';
import * as bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { typeDefs } from './graph-ql-schema';
import { GraphQLResolvers } from './graph-ql-resolvers';
class HttpError extends Error {
    status: number = 0;
}



export class Server {
    // Initialize the app
    public app: express.Express;
    private parser: GraphQLResolvers;

    constructor() {
        this.app = express();
        this.parser = new GraphQLResolvers();
        this.parser.loadSnapshot("C:\\\\Users\\\\mukav\\\\Downloads\\\\Heap-Test-StringConcat.heapsnapshot");
        let resolvers = this.parser.resolvers();
        // Put together a schema
        const schema = makeExecutableSchema({
            typeDefs,
            resolvers
        });
        // The GraphQL endpoint
        this.app.use('/graphql', bodyParser.json(), graphqlExpress({
            schema
        }));

        // GraphiQL, a visual editor for queries
        this.app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));
    }
}
