import { parseSnapshotFromFile, Snapshot, Node } from 'v8-heapsnapshot';
import { HeapNodeUtils, AggregatedSize } from './v8-snapshot-utils';
import { IResolvers } from 'graphql-tools';
import _take from 'lodash-es/take';
import _orderBy from 'lodash-es/orderBy';
import _filter from 'lodash-es/filter';
declare type orderByDir = 'desc' | 'asc';
export interface Resolvers {
    nodes: (filter: Predicate, first: number, orderBy: OrderBy) => Node[],
    types: (filter: Predicate, first: number, orderBy: OrderBy) => AggregatedSize[],
    prototypes: (filter: Predicate, first: number, orderBy: OrderBy) => AggregatedSize[],
}

export interface Predicate {
    field: string,
    value: string
}

export interface OrderBy {
    field: string,
    direction: orderByDir
}
export class GraphQLResolvers {
    private parsedTypes: AggregatedSize[] = [];
    private parsedPrototypes: AggregatedSize[] = [];
    constructor() {
    }

    public async loadSnapshot(fileName: string): Promise<void> {
        try {
            console.log(`Parsing snapshot from: ${fileName}`);
            let snapshot = await parseSnapshotFromFile(fileName);
            console.log(`Finished parsing snapshot`);

            let nodes = HeapNodeUtils.processNodes(snapshot.nodes);
            console.log(`Finished processing snapshot`);

            this.parsedTypes = HeapNodeUtils.getTypes(nodes);
            console.log(`Finished parsing types`);

            this.parsedPrototypes = HeapNodeUtils.getPrototypes(nodes);
            snapshot = undefined;
            console.log(`Finished parsing prototypes`);

        } catch (e) {
            console.error(e);
        }
    }

    public resolvers(): IResolvers {
        return {
            Query: {
                types: (source: any, args: {[argument: string]: any }) => GraphQLResolvers.applyFilters(this.parsedTypes, args),
                prototypes: (source: any, args: {[argument: string]: any }) => GraphQLResolvers.applyFilters(this.parsedPrototypes, args),
            }
        }
    }

    public static applyFilters<T>(collection: T[], args: {[argument: string]: any }): T[] {
        let result = collection;
        console.log(JSON.stringify(args));
        let filter = args['filter'];
        if (filter && filter.field) {
            result = _filter(result, [filter.field, filter.value]);
        }

        let orderBy = args['orderBy'];
        if (orderBy && orderBy.field) {
            result = _orderBy(result, [orderBy.field], [orderBy.direction]);
        }

        let first = <number>args['first'];
        if (first) {
            result = _take(result, first);
        }
        return result;
    }
}
