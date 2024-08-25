from collections import defaultdict


class UnionFind:
    def __init__(self, items):
        self.items = items.copy()
        self.parent = {x: x for x in items}
        self.size = {x: 1 for x in items}

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def unite(self, x, y):
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return False
        if self.size[x] < self.size[y]:
            root_x, root_y = root_y, root_x
        self.parent[root_y] = root_x
        self.size[root_x] += self.size[root_y]
        return True

    def get_groups(self):
        groups = defaultdict(set)
        for item in self.items:
            groups[self.find(item)].add(item)
        return groups
