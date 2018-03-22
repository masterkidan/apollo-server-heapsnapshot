// The GraphQL schema in string form
export const typeDefs = `
    enum EdgeType {
        context
        element
        property
        internal
        hidden
        shortcut
        weak
    }
    type Edge {
        type: EdgeType
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
        key: String!
        subNodes: [Node]
        self_size: Int
        retained_size: Int
        objectCount: Int
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
        nodes(filter: Predicate, first: Int, orderBy: OrderBy): [Node]
        types(filter: Predicate, first: Int, orderBy: OrderBy): [AggregatedSize]   
        prototypes(filter: Predicate, first: Int, orderBy: OrderBy): [AggregatedSize]
    }
`;