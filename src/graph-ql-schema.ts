// The GraphQL schema in string form
export const typeDefs = `
    type Edge {
        type: String
        name: String!
        from: Node
        to: Node
    }
    type Node { 
        type: String
        name: String!
        id: ID!
        self_size: Int
        edge_count: Int
        trace_node_id: Int
        out_edges: [Edge]
        in_edges: [Edge]    
    }
    type AggregatedSize {
        name: ID!
        shallowSize: Int
        objectCount: Int
    }
    type AggregatedPrototypeSize {
        name: ID!
        type: String
        shallowSize: Int
        retainedSize: Int
        objectCount: Int
        subTypes: [AggregatedSize]
    }
    input Predicate {
        field: String,
        value: String
    }
    
    input OrderBy {
        field: String,
        direction: String
    }

    type Query {
        types(filter: Predicate, first: Int, orderBy: OrderBy): [AggregatedSize]   
        prototypes(filter: Predicate, first: Int, orderBy: OrderBy): [AggregatedPrototypeSize]
    }
`;