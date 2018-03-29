import { Node, Snapshot, Edge } from 'v8-heapsnapshot';
import reduce from 'lodash-es/reduce';
import filter from 'lodash-es/filter';
import flatten from 'lodash-es/flatten';
import map from 'lodash-es/map';
import * as process from 'process';
import * as readline from 'readline';
import { print } from 'util';

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

export interface HeapNode extends Node {
    retained_size: number;
    subTypes: Map<string, AggregatedSize>
}

function printProgress(current: number, total: number): void {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`processing ${current} of ${total}`);
}

export class HeapNodeUtils {
    public static processNodes(nodes: Node[]): HeapNode[] {
        let retainedSizeMap = new Map<number, Map<string, AggregatedSize>>();
        let total = nodes.length;
        let i = 0;
        return nodes.map(node => {
            let heapNode = <HeapNode>node;
            if (heapNode.retained_size) {
                return heapNode;
            }

            if (retainedSizeMap.has(heapNode.id)) {
                let retainedSizeByType = retainedSizeMap.get(heapNode.id);
                heapNode.subTypes = retainedSizeByType;
                heapNode.retained_size = HeapNodeUtils.getRetainedSizeFromSubTypes(heapNode.subTypes);
                return heapNode;
            }

            heapNode.subTypes = HeapNodeUtils.getSizeByType(node, retainedSizeMap);
            heapNode.retained_size = this.getRetainedSizeFromSubTypes(heapNode.subTypes);
            i = i + 1;
            printProgress(i, total);
            return heapNode;
        });
    }

    private static getRetainedSizeFromSubTypes(subTypes: Map<string, AggregatedSize>) {
        let sum = 0;
        for (let [key, value] of subTypes) {
            sum += value.shallowSize;
        }

        return sum;
    }

    public static getRetainedSize(node: Node): number {
        let sum = 0;
        HeapNodeUtils.visitRetainerTree(node, (n) => sum += n.self_size);
        return sum;
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
    private static getSizeByType(node: Node, precalculatedTypeMap: Map<number, Map<string, AggregatedSize>>): Map<string, AggregatedSize> {
        if (precalculatedTypeMap.has(node.id)) {
            return precalculatedTypeMap.get(node.id);
        }

        let queue = <Array<HeapNode>>[node];
        let currNode = <HeapNode>queue.pop();
        while (currNode) {
            if (currNode.in_edges.length == 0) {
                let totalTypeSize = new Map<string, AggregatedSize>();
                let size = {
                    objectCount: 1,
                    name: currNode.type,
                    shallowSize: currNode.self_size
                };
                totalTypeSize.set(currNode.type, size);
                precalculatedTypeMap.set(currNode.id, totalTypeSize);
                currNode = queue.pop();
            } else {
                let edges = currNode.in_edges;
                let totalTypeSize = new Map<string, AggregatedSize>();
                let canCalculateSize = true;
                for (let i in edges) {
                    let n = edges[i].from;
                    if (precalculatedTypeMap.has(n.id)) {
                        totalTypeSize = HeapNodeUtils.mergeSubTypes(totalTypeSize, precalculatedTypeMap.get(n.id));
                    } else {
                        let index = queue.findIndex((item) => item.id == n.id)
                        if (index == -1) {
                            canCalculateSize = false;
                            queue.push(<HeapNode>n);
                        } else {
                            // let offender = {
                            //     name: queue[index].name,
                            //     id: queue[index].id, 
                            //     type: queue[index].type,
                            //     self_size: queue[index].self_size
                            // };
                            // console.log(`Item in queue: ${JSON.stringify(offender)}`);
                            // let victim = {
                            //     name: n.name, 
                            //     id: n.id, 
                            //     type: n.type, 
                            //     self_size: n.self_size
                            // };
                            // console.log(`Item in edge: ${JSON.stringify(victim)}`);
                        }
                    }
                }

                if (canCalculateSize) {
                    precalculatedTypeMap.set(currNode.id, totalTypeSize);
                    currNode = queue.pop();
                }
            }
        }
        return precalculatedTypeMap.get(node.id);
    }

    private static getTypeMap(nodes: Node[]): Map<string, AggregatedSize> {
        return reduce(nodes, (sumMap: Map<string, AggregatedSize>, curr: Node) => {
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
        }, new Map<string, AggregatedSize>());
    }

    public static getTypes(nodes: Node[]): AggregatedSize[] {
        return Array.from(HeapNodeUtils.getTypeMap(nodes).values());
    }

    public static getPrototypes(nodes: HeapNode[]): AggregatedPrototypeSize[] {
        let subTypeMap = new Map<string, Map<string, AggregatedSize>>();
        let prototypeMap = reduce(nodes, (sumMap: Map<string, AggregatedPrototypeSize>, curr: HeapNode) => {
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
                    subTypes: undefined
                };
                subTypeMap.set(prototypeName, new Map<string, AggregatedSize>())
            } else {
                currentState = sumMap.get(prototypeName);
            }

            currentState.objectCount++;
            currentState.shallowSize = currentState.shallowSize + curr.self_size;
            currentState.retainedSize = currentState.retainedSize + curr.retained_size;
            subTypeMap.set(prototypeName, HeapNodeUtils.mergeSubTypes(subTypeMap.get(prototypeName), curr.subTypes));
            sumMap.set(prototypeName, currentState);
            return sumMap;
        }, new Map<string, AggregatedPrototypeSize>());

        for (let [key, value] of prototypeMap) {
            value.subTypes = Array.from(subTypeMap.get(key).values());
            prototypeMap.set(key, value);
        }

        return Array.from(prototypeMap.values());
    }

    private static mergeSubTypes(type1: Map<string, AggregatedSize>, type2: Map<string, AggregatedSize>): Map<string, AggregatedSize> {
        if (!type1 || type1.size == 0) {
            return type2;
        }

        if (!type2 || type2.size == 0) {
            return type1;
        }

        let parentMap = (type1.size > type2.size) ? type1 : type2;
        let childMap = (type1.size > type2.size) ? type2 : type1;
        for (let [key, value] of childMap) {
            let shallowSize = value.shallowSize + (parentMap.has(key) ? parentMap.get(key).shallowSize : 0);
            let objectCount = value.objectCount + (parentMap.has(key) ? parentMap.get(key).objectCount : 0);
            parentMap.set(key, {
                name: value.name,
                objectCount: objectCount,
                shallowSize: shallowSize
            });
        }

        return parentMap;
    }
}
