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
        let sum = 0;
        let queue = nodes;
        let currNode = nodes.pop();
        let visited = new Map<number, boolean>();
        
        while (currNode) {
            if (!visited.get(currNode.id)) {
                sum += currNode.self_size;
                currNode.in_edges.forEach(e => {
                    if (!visited.get(e.from.id)) {
                        nodes.push(e.from);
                    }
                });
                visited.set(currNode.id, true);
            }
            currNode = nodes.pop();
        }

        return sum;
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

    public static getTypes(snapshot: Snapshot): AggregatedSize[] {
        return Array.from(reduce(snapshot.nodes, (sumMap: Map<string, AggregatedSize>, curr: Node) => {
            if (!sumMap.has(curr.type)) {
                sumMap.set(curr.type, { name: curr.type, subNodes: [], objectCount: 0, self_size: 0, retained_size: 0 });
            }
            sumMap.get(curr.type).objectCount++;
            // sumMap.get(curr.type).subNodes.push(curr);
            sumMap.get(curr.type).self_size += curr.self_size;
            // sumMap.get(curr.type).retained_size += HeapNodeUtils.getRetainedSize([curr]);
            return sumMap;
        }, new Map<string, AggregatedSize>()).values());
    }

    public static getPrototypes(snapshot: Snapshot): AggregatedSize[] {
        return Array.from(reduce(snapshot.nodes, (sumMap: Map<string, AggregatedSize>, curr: Node) => {
            if (!sumMap.has(curr.name)) {
                sumMap.set(curr.name, { name: curr.name, subNodes: [], objectCount: 0, self_size: 0, retained_size: 0 });
            }
            sumMap.get(curr.name).objectCount++;
            // sumMap.get(curr.name).subNodes.push(curr);
            sumMap.get(curr.name).self_size += curr.self_size;
            // sumMap.get(curr.name).retained_size += HeapNodeUtils.getRetainedSize([curr]);
            return sumMap;
        }, new Map<string, AggregatedSize>()).values());
    }
}
