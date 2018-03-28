import { Node, Snapshot, Edge } from 'v8-heapsnapshot';
import reduce from 'lodash-es/reduce';
import filter from 'lodash-es/filter';
import flatten from 'lodash-es/flatten';
import map from 'lodash-es/map';

export interface AggregatedSize {
    name: string,
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
        }
    }
    public static visitRetainerTree(node: Node, reducer: (node: Node) => void): void {
        let queue = [node];
        let currNode = queue.pop();
        let visited = new Map<number, boolean>();

        while (currNode) {
            if (!visited.get(currNode.id)) {
                reducer(currNode);
                currNode.in_edges.forEach(e => {
                    if (!visited.get(e.from.id)) {
                        queue.push(e.from);
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
            let currentState: AggregatedSize;
            if (!sumMap.has(curr.type)) {
                currentState = { name: curr.type, objectCount: 0, shallowSize: 0 };
            } else {
                currentState = sumMap.get(curr.type);
            }
            currentState.objectCount++;
            currentState.shallowSize = currentState.shallowSize + curr.self_size;
            sumMap.set(curr.type, currentState);
            return sumMap;
        }, new Map<string, AggregatedSize>()).values());
    }

    public static getPrototypes(nodes: Node[]): AggregatedPrototypeSize[] {
        let prototypeNodeMap = new Map<string, AggregatedSize[]>();
        let prototypeMap = reduce(nodes, (sumMap: Map<string, AggregatedPrototypeSize>, curr: Node) => {
            let prototypeName = curr.name;
            // See below doc for why this is done https://v8docs.nodesource.com/node-9.3/d8/da4/classv8_1_1_heap_graph_node.html#a452252d3974a97cbe0493e80d2522195
            // in the case of strings/ regexs prototypeName == value of object  
            if (curr.type === 'string' || curr.type === 'regexp') {
                prototypeName = curr.type;
            }

            let currentState: AggregatedPrototypeSize;
            if (!sumMap.has(prototypeName)) {
                currentState = {
                    name: prototypeName,
                    type: curr.type,
                    objectCount: 0,
                    shallowSize: 0,
                    retainedSize: 0,
                    subTypes: []
                };
                prototypeNodeMap.set(prototypeName, []);
            } else {
                currentState = sumMap.get(prototypeName);
            }

            currentState.objectCount++;
            let typeMap = HeapNodeUtils.getSizeByType(curr);
            
            currentState.shallowSize = currentState.shallowSize + curr.self_size;
            sumMap.set(prototypeName, currentState);
            return sumMap;
        }, new Map<string, AggregatedPrototypeSize>());
        
        // for (let [key, value] of prototypeNodeMap) {
        //     let storedEntry = prototypeMap.get(key);
        //     let retainedSize = 0;
        //     storedEntry.subTypes = Array.from(reduce(value, (s, v) => {
        //         let currVal = s.get(v.name);
        //         currVal.shallowSize = currVal.shallowSize + v.shallowSize;
        //         currVal.objectCount = currVal.objectCount + v.objectCount;
        //         retainedSize = retainedSize + v.shallowSize;
        //         s.set(v.name, currVal);
        //         return s;
        //     }, new Map<string, AggregatedSize>()).values());
        //     storedEntry.retainedSize = retainedSize;
        //     prototypeMap.set(key, storedEntry);
        // }

        return Array.from(prototypeMap.values());
    }
}
