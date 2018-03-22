import { Node, Snapshot, Edge } from 'v8-heapsnapshot';
import reduce from 'lodash-es/reduce';
import filter from 'lodash-es/filter';
import flatten from 'lodash-es/flatten';
import map from 'lodash-es/map';

export interface AggregatedSize {
    name: string,
    subNodes: Node[],
    self_size: number,
    retained_size: number,
    objectCount: number
}

export class HeapNodeUtils {
    public static getRetainedSize(nodes: Node[]): number {
        return reduce(nodes, (sum, node: Node) => reduce(node.in_edges, (sum: number, curr: Edge) => sum + curr.to.self_size, 0), 0);
    }

    public static getRetainedSizeByPrototype(snapshot: Snapshot, prototypeName: string): AggregatedSize {
        let matchingNodes = filter(snapshot.nodes, (node) => node.name === prototypeName);
        return {
            name: prototypeName,
            self_size: reduce(matchingNodes, (sum, node) => sum + node.self_size, 0),
            retained_size: HeapNodeUtils.getRetainedSize(matchingNodes),
            objectCount: matchingNodes.length,
            subNodes: flatten(map(matchingNodes, n => map(n.in_edges, edge => edge.to)))
        }
    }

    public static getRetainedSizeByType(snapshot: Snapshot, typeName: string): AggregatedSize {
        let matchingNodes = filter(snapshot.nodes, (node) => node.type === typeName);
        return {
            name: typeName,
            self_size: reduce(matchingNodes, (sum, node) => sum + node.self_size, 0),
            retained_size: HeapNodeUtils.getRetainedSize(matchingNodes),
            objectCount: matchingNodes.length,
            subNodes: flatten(map(matchingNodes, n => map(n.in_edges, edge => edge.to)))
        }
    }

    public static getTypes(snapshot: Snapshot): Map<string, AggregatedSize> {
        return reduce(snapshot.nodes, (sumMap: any, curr: Node) => {
            if (!sumMap.has(curr.type)) {
                sumMap.set(curr.type, { name: curr.type, subNodes: [], objectCount: 0, self_size: 0, retained_size: 0 });
            }

            sumMap.get(curr.type).subNodes.push(curr);
            sumMap.get(curr.type).self_size += curr.self_size;
            sumMap.get(curr.type).retained_size += HeapNodeUtils.getRetainedSize([curr]);
        }, new Map<string, AggregatedSize>());
    }

    public static getPrototypes(snapshot: Snapshot): Map<string, AggregatedSize> {
        return reduce(snapshot.nodes, (sumMap: any, curr: Node) => {
            if (!sumMap.has(curr.name)) {
                sumMap.set(curr.name, { name: curr.name, subNodes: [], objectCount: 0, self_size: 0, retained_size: 0 });
            }

            sumMap.get(curr.name).subNodes.push(curr);
            sumMap.get(curr.name).self_size += curr.self_size;
            sumMap.get(curr.name).retained_size += HeapNodeUtils.getRetainedSize([curr]);
        }, new Map<string, AggregatedSize>());
    }
}
