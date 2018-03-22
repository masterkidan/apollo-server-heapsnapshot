// The GraphQL schema in string form
export const typeDefs = `
    enum NodeType {
        hidden
        array
        string
        object 
        code
        closure
        regexp 
        number
        native
        synthetic
        concatenated string
        sliced string
        symbol
    }
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
        type: NodeType
        name: String!
        id: ID!
        self_size: Int
        edge_count: Int
        trace_node_id: Int
        out_edges: Edge[]
        in_edges: Edge[]    
    }
    type AggregatedSize {
        key: String!
        subNodes: [Node]
        self_size: Int
        retained_size: Int
    }
    query {
        nodes: [Node]
        types: [AggregatedSize]
        type($typeName: name): AggregatedSize       
        Prototypes: [AggregatedSizes]
        Prototype($prototypeName: name): AggregatedSize
    }
`;