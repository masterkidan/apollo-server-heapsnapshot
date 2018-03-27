import { Node, Snapshot, Edge } from 'v8-heapsnapshot';
import reduce from 'lodash-es/reduce';
import filter from 'lodash-es/filter';
import flatten from 'lodash-es/flatten';
import map from 'lodash-es/map';

export interface AggregatedSize {
    name: string,
    subNodes: Node[],
    shallowSize: number,
    objectCount: number
}

export interface AggregatedPrototypeSize extends AggregatedSize {
    subTypes: AggregatedSize[];
    type: string;
    retainedSize: number;
}

export class HeapNodeUtils {
    public static getRetainedSize(node: Node): number {
        let sum = 0;
        HeapNodeUtils.visitRetainerTree(node, (n) => sum += n.self_size);
        return sum;
    }

    public static getRetainedSizeByPrototype(snapshot: Snapshot, prototypeName: string): AggregatedSize {
        let matchingNodes = filter(snapshot.nodes, (node) => node.name === prototypeName);
        return {
            name: prototypeName,
            shallowSize: reduce(matchingNodes, (sum, node) => sum + node.self_size, 0),
            objectCount: matchingNodes.length,
            subNodes: flatten(map(matchingNodes, n => map(n.in_edges, edge => edge.to)))
        }
    }
    public static visitRetainerTree(node: Node, reducer: (node: Node) => void): void {
        let queue = [node];
        let currNode = queue.pop();
        let visited = new Map<number, boolean>();

        while (currNode) {
            if (!visited.get(currNode.id)) {
                reducer(currNode);
                currNode.out_edges.forEach(e => {
                    if (!visited.get(e.to.id)) {
                        queue.push(e.to);
                    }
                });
                visited.set(currNode.id, true);
            }
            currNode = queue.pop();
        }
    }
    public static getSizeByType(node: Node): AggregatedSize[] {
        let matchingNodes = [];
        HeapNodeUtils.visitRetainerTree(node, (n) => matchingNodes.push(n));
        return HeapNodeUtils.getTypes(matchingNodes);
    }

    public static getTypes(nodes: Node[]): AggregatedSize[] {
        return Array.from(reduce(nodes, (sumMap: Map<string, AggregatedSize>, curr: Node) => {
            if (!sumMap.has(curr.type)) {
                sumMap.set(curr.type, { name: curr.type, subNodes: [], objectCount: 0, shallowSize: 0 });
            }
            sumMap.get(curr.type).objectCount++;
            sumMap.get(curr.type).subNodes.push(curr);
            sumMap.get(curr.type).shallowSize += curr.self_size;
            // sumMap.get(curr.type).retained_size += HeapNodeUtils.getRetainedSize([curr]);
            return sumMap;
        }, new Map<string, AggregatedSize>()).values());
    }

    public static getPrototypes(nodes: Node[]): AggregatedPrototypeSize[] {
        return Array.from(reduce(nodes, (sumMap: Map<string, AggregatedPrototypeSize>, curr: Node) => {
            let prototypeName = curr.name;
            // See below doc for why this is done https://v8docs.nodesource.com/node-9.3/d8/da4/classv8_1_1_heap_graph_node.html#a452252d3974a97cbe0493e80d2522195
            // in the case of strings/ regexs prototypeName == value of object  
            if (curr.type === 'string' || curr.type === 'regexp') {
                prototypeName = curr.type;
            }

            prototypeName = `${prototypeName}:${curr.type}`;
            if (!sumMap.has(prototypeName)) {
                sumMap.set(prototypeName, {
                    name: prototypeName,
                    subNodes: [],
                    type: curr.type,
                    objectCount: 0,
                    shallowSize: 0,
                    retainedSize: 0,
                    subTypes: []
                });
            }
            sumMap.get(prototypeName).objectCount++;
            sumMap.get(prototypeName).subNodes.push(curr);
            sumMap.get(prototypeName).shallowSize += curr.self_size;
            let curArr = sumMap.get(prototypeName).subTypes;
            curArr = curArr.concat(HeapNodeUtils.getSizeByType(curr));
            sumMap.get(prototypeName).subTypes = curArr;
            sumMap.get(prototypeName).retainedSize += reduce(curArr, (s, n) => s + n.shallowSize, 0);
            return sumMap;
        }, new Map<string, AggregatedPrototypeSize>()).values());
    }
}
