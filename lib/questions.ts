// Question bank. Each question has:
//  - description: Markdown shown in the left panel
//  - starter: initial code placed in the shared editor
//  - tests: Python source defining CASES (and optionally `check`) — run by the harness
//    in public/py-worker.js against the user's namespace.

export type Question = {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  description: string;
  starter: string;
  tests: string;
};

const garden: Question = {
  slug: "garden-watering",
  title: "Garden Watering Optimization",
  difficulty: "Medium",
  tags: ["Graphs", "DFS / BFS"],
  description: `
You are given a network of planters represented as a graph, where each planter has a specific height and is connected to other planters. Your goal is to determine which **single planter** you should water to maximize the total number of **unique planters** that receive water via runoff.

### Input Data

1. **Adjacency List \`A\`**: a list where the \`i\`-th element \`A[i]\` contains the indices of the planters connected to planter \`i\`.
2. **Heights List \`H\`**: a list where the \`i\`-th element \`H[i]\` is the height of planter \`i\`.

---

### Part 1: Direct Downstream Runoff

**Rule:** If you water planter \`i\`, it waters itself and any of its **direct** neighboring planters that are strictly shorter than it (\`H[neighbor] < H[i]\`).

**Goal:** Return the index of the planter that results in the highest total number of watered planters (itself plus its directly watered neighbors). If there are multiple acceptable answers, any of them can be returned.

\`\`\`python
def best_planter_direct(A: list[list[int]], H: list[int]) -> int
\`\`\`

---

### Part 2: Transitive Cascading Runoff

**Rule:** With a larger watering can, water can now flow further. Planters that receive runoff cascade water to their own neighbors, as long as those neighbors are still strictly shorter at each step down the chain.

**Mechanism:** Water flows along paths of strictly decreasing heights (\`... > H[v] > H[u] > ...\`) as far as possible, forming a directed acyclic flow / tree-like descent.

**Goal:** You can still only choose one initial planter. Return the planter that yields the maximum total number of **unique** reachable planters through this cascading runoff.

\`\`\`python
def best_planter_cascade(A: list[list[int]], H: list[int]) -> int
\`\`\`

---

### Example

\`\`\`
A = [[1], [0, 2], [1, 3], [2, 4], [3], [6, 7, 8], [5], [5], [5]]
H = [5, 4, 3, 2, 1, 2, 1, 1, 1]
\`\`\`

- Planters \`0-1-2-3-4\` form a descending chain; planter \`5\` is a hub with three short neighbors.
- **Part 1:** planter \`5\` waters itself + \`6, 7, 8\` → **4** planters. Answer: \`5\`.
- **Part 2:** planter \`0\` cascades down the whole chain → **5** planters. Answer: \`0\`.

### Notes
- The graph is undirected (if \`j\` is in \`A[i]\`, then \`i\` is in \`A[j]\`).
- Tests accept **any** index that achieves the maximum count.
`.trim(),
  starter: `from typing import List


def best_planter_direct(A: List[List[int]], H: List[int]) -> int:
    """Part 1: water a planter + its strictly-shorter direct neighbors."""
    pass


def best_planter_cascade(A: List[List[int]], H: List[int]) -> int:
    """Part 2: water cascades along strictly decreasing heights."""
    pass


if __name__ == "__main__":
    A = [[1], [0, 2], [1, 3], [2, 4], [3], [6, 7, 8], [5], [5], [5]]
    H = [5, 4, 3, 2, 1, 2, 1, 1, 1]
    print("Part 1:", best_planter_direct(A, H))   # expect 5
    print("Part 2:", best_planter_cascade(A, H))  # expect 0
`,
  tests: String.raw`
import random

def _direct(A, H, i):
    return 1 + len({j for j in A[i] if j != i and H[j] < H[i]})

def _cascade(A, H, i):
    seen = {i}
    stack = [i]
    while stack:
        u = stack.pop()
        for v in A[u]:
            if H[v] < H[u] and v not in seen:
                seen.add(v)
                stack.append(v)
    return len(seen)

def _rand_graph(n, m, hmax, seed):
    rng = random.Random(seed)
    adj = [set() for _ in range(n)]
    for _ in range(m):
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            adj[a].add(b); adj[b].add(a)
    return [sorted(s) for s in adj], [rng.randint(1, hmax) for _ in range(n)]

_ex_A = [[1], [0, 2], [1, 3], [2, 4], [3], [6, 7, 8], [5], [5], [5]]
_ex_H = [5, 4, 3, 2, 1, 2, 1, 1, 1]
_single = ([[]], [7])
_flat = ([[1, 2], [0, 2], [0, 1]], [3, 3, 3])
_tri = ([[1, 2], [0, 2], [0, 1]], [3, 2, 1])
# Diamond: two paths down to the same planter — must count it once.
_diamond = ([[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]], [10, 6, 5, 2, 1])
_r1 = _rand_graph(40, 70, 9, 1)
_r2 = _rand_graph(300, 900, 50, 2)

CASES = []
for part, func in (("Part 1", "best_planter_direct"), ("Part 2", "best_planter_cascade")):
    for label, (A, H) in [
        ("example", (_ex_A, _ex_H)),
        ("single planter", _single),
        ("all same height", _flat),
        ("triangle", _tri),
        ("diamond (shared descendant)", _diamond),
        ("random n=40", _r1),
        ("random n=300", _r2),
    ]:
        CASES.append({"name": f"{part}: {label}", "func": func, "args": [A, H]})

def check(case, got):
    A, H = case["args"]
    score = _direct if case["func"] == "best_planter_direct" else _cascade
    best = max(score(A, H, i) for i in range(len(H)))
    if not isinstance(got, int) or isinstance(got, bool) or not (0 <= got < len(H)):
        return False, f"any index with count {best}"
    s = score(A, H, got)
    return s == best, f"any index with count {best} (yours waters {s})"
`.trim(),
};

const stock: Question = {
  slug: "best-time-to-buy-and-sell-stock",
  title: "Best Time to Buy and Sell Stock",
  difficulty: "Easy",
  tags: ["Arrays", "Greedy"],
  description: `
You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on day \`i\`.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return *the maximum profit you can achieve from this transaction*. If you cannot achieve any profit, return \`0\`.

\`\`\`python
def max_profit(prices: list[int]) -> int
\`\`\`

### Example 1
\`\`\`
Input:  prices = [7, 1, 5, 3, 6, 4]
Output: 5
\`\`\`
Buy on day 1 (price = 1) and sell on day 4 (price = 6), profit = 6 - 1 = 5.
Note that buying on day 1 and selling on day 0 is not allowed because you must buy before you sell.

### Example 2
\`\`\`
Input:  prices = [7, 6, 4, 3, 1]
Output: 0
\`\`\`
No transaction is done, so the max profit is 0.

### Constraints
- \`1 <= len(prices) <= 10^5\`
- \`0 <= prices[i] <= 10^4\`
- Aim for **O(n)** time — one of the tests has 100,000 prices.
`.trim(),
  starter: `from typing import List


def max_profit(prices: List[int]) -> int:
    pass


if __name__ == "__main__":
    print(max_profit([7, 1, 5, 3, 6, 4]))  # expect 5
    print(max_profit([7, 6, 4, 3, 1]))     # expect 0
`,
  tests: String.raw`
import random
_rng = random.Random(42)
_big = [_rng.randint(0, 10000) for _ in range(100000)]

def _ref(p):
    lo, best = float("inf"), 0
    for x in p:
        lo = min(lo, x)
        best = max(best, x - lo)
    return best

CASES = [
    {"name": "example 1", "func": "max_profit", "args": [[7, 1, 5, 3, 6, 4]], "expected": 5},
    {"name": "example 2 (falling)", "func": "max_profit", "args": [[7, 6, 4, 3, 1]], "expected": 0},
    {"name": "single day", "func": "max_profit", "args": [[5]], "expected": 0},
    {"name": "two days up", "func": "max_profit", "args": [[1, 2]], "expected": 1},
    {"name": "min after max", "func": "max_profit", "args": [[2, 4, 1]], "expected": 2},
    {"name": "later lower min", "func": "max_profit", "args": [[3, 2, 6, 5, 0, 3]], "expected": 4},
    {"name": "flat", "func": "max_profit", "args": [[3, 3, 3, 3]], "expected": 0},
    {"name": "100k increasing", "func": "max_profit", "args": [list(range(100000))], "expected": 99999},
    {"name": "100k random", "func": "max_profit", "args": [_big], "expected": _ref(_big)},
]
`.trim(),
};

const parens: Question = {
  slug: "valid-parentheses",
  title: "Valid Parentheses",
  difficulty: "Easy",
  tags: ["Stack", "Strings"],
  description: `
Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:

1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

\`\`\`python
def is_valid(s: str) -> bool
\`\`\`

### Example 1
\`\`\`
Input:  s = "()"
Output: True
\`\`\`

### Example 2
\`\`\`
Input:  s = "()[]{}"
Output: True
\`\`\`

### Example 3
\`\`\`
Input:  s = "(]"
Output: False
\`\`\`

### Example 4
\`\`\`
Input:  s = "([])"
Output: True
\`\`\`

### Example 5
\`\`\`
Input:  s = "([)]"
Output: False
\`\`\`

### Constraints
- \`1 <= len(s) <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'\`.
`.trim(),
  starter: `def is_valid(s: str) -> bool:
    pass


if __name__ == "__main__":
    for s in ["()", "()[]{}", "(]", "([])", "([)]"]:
        print(repr(s), is_valid(s))
`,
  tests: String.raw`
CASES = [
    {"name": f"is_valid({s!r})" if len(s) < 30 else f"long string (len {len(s)})",
     "func": "is_valid", "args": [s], "expected": e}
    for s, e in [
        ("()", True),
        ("()[]{}", True),
        ("(]", False),
        ("([])", True),
        ("([)]", False),
        ("{[]}", True),
        ("(", False),
        (")", False),
        ("((", False),
        ("){", False),
        ("[({})]{}()", True),
        ("(((((((((())))))))))", True),
        ("(" * 5000 + ")" * 5000, True),
        ("(" * 5000 + ")" * 4999 + "]", False),
    ]
]
`.trim(),
};

export const QUESTIONS: Question[] = [garden, stock, parens];

export function getQuestion(slug: string): Question | undefined {
  return QUESTIONS.find((q) => q.slug === slug);
}
