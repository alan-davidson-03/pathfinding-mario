/**
 * MinHeap / Priority Queue implementation for Dijkstra's Algorithm
 * Guarantees O(log N) insertion and extraction of the minimum distance node.
 */
export class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  push(element, priority) {
    const node = { element, priority };
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min.element;
  }

  peek() {
    return this.isEmpty() ? null : this.heap[0].element;
  }

  clear() {
    this.heap = [];
  }

  _bubbleUp(index) {
    const node = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (node.priority >= parent.priority) break;
      this.heap[parentIdx] = node;
      this.heap[index] = parent;
      index = parentIdx;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const node = this.heap[index];

    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let swapIdx = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < node.priority) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const comparePriority = swapIdx === null ? node.priority : this.heap[leftChildIdx].priority;
        if (this.heap[rightChildIdx].priority < comparePriority) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;

      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = node;
      index = swapIdx;
    }
  }
}
