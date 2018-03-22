import { parseSnapshotFromFile, Snapshot, Node } from 'v8-heapsnapshot';
import { HeapNodeUtils, AggregatedSize } from './v8-snapshot-utils';
export interface Resolvers {
    nodes: () => Node[],
    types: () => AggregatedSize[],
    type: (typeName: string) => AggregatedSize,
    prototypes: () => AggregatedSize[],
    prototype: (prototypeName: string) => AggregatedSize
}
export interface QueryResolvers {
    query: Resolvers
}
export class Parser {
    private snapshot: Snapshot;
    constructor() {
    }

    public async loadSnapshot(fileName: string): Promise<void> {
        try
        {
            console.log(`Parsing snapshot from: ${fileName}`);
            await parseSnapshotFromFile(fileName);
            console.log(`Finished parsing snapshot`);
        } catch(e) {
            console.error(e);
        }
    }

    public resolvers(): QueryResolvers {
        return {
            query: {
                nodes: () => this.snapshot.nodes ,
                types: () => Array.from<AggregatedSize>(HeapNodeUtils.getTypes(this.snapshot).values()), 
                type: (typeName: string) => HeapNodeUtils.getRetainedSizeByType(this.snapshot, typeName),
                prototypes: () => Array.from<AggregatedSize>(HeapNodeUtils.getPrototypes(this.snapshot).values()), 
                prototype: (prototypeName: string) => HeapNodeUtils.getRetainedSizeByPrototype(this.snapshot, prototypeName)
            }
        }
    }
}
