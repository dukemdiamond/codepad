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
  viz?: "garden";
};

const garden: Question = {
  slug: "garden-watering",
  viz: "garden",
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

### Visualize

Planters are drawn at their height. Click one to water it and watch the runoff flow downhill. Everyone in the session sees the same view.

<!-- viz -->

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

const twoSum: Question = {
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "Easy",
  tags: ["Arrays", "Hash Map"],
  description: `
Given a list of integers \`nums\` and an integer \`target\`, return the indices of the two numbers that add up to \`target\`.

Every input has exactly one valid pair, and you can't use the same element twice. Return the two indices in any order.

\`\`\`python
def two_sum(nums: list[int], target: int) -> list[int]
\`\`\`

### Example 1
\`\`\`
Input:  nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
\`\`\`
\`nums[0] + nums[1] == 9\`.

### Example 2
\`\`\`
Input:  nums = [3, 2, 4], target = 6
Output: [1, 2]
\`\`\`

### Example 3
\`\`\`
Input:  nums = [3, 3], target = 6
Output: [0, 1]
\`\`\`

### Constraints
- \`2 <= len(nums) <= 10^4\`
- \`-10^9 <= nums[i], target <= 10^9\`
- The brute-force O(n²) solution works, but try for **O(n)**. One test has 10,000 numbers.
`.trim(),
  starter: `from typing import List


def two_sum(nums: List[int], target: int) -> List[int]:
    pass


if __name__ == "__main__":
    print(two_sum([2, 7, 11, 15], 9))  # expect [0, 1]
    print(two_sum([3, 2, 4], 6))       # expect [1, 2]
`,
  tests: String.raw`
_big = list(range(1, 10001))
CASES = [
    {"name": "example 1", "func": "two_sum", "args": [[2, 7, 11, 15], 9]},
    {"name": "example 2", "func": "two_sum", "args": [[3, 2, 4], 6]},
    {"name": "duplicates", "func": "two_sum", "args": [[3, 3], 6]},
    {"name": "negatives", "func": "two_sum", "args": [[-1, -2, -3, -4, -5], -8]},
    {"name": "zeros", "func": "two_sum", "args": [[0, 4, 3, 0], 0]},
    {"name": "pair at the end", "func": "two_sum", "args": [[1, 5, 9, 2, 8], 10]},
    {"name": "10k numbers", "func": "two_sum", "args": [_big, 19999]},
]

def check(case, got):
    nums, target = case["args"]
    try:
        i, j = got
    except Exception:
        return False, "two distinct indices that sum to target"
    ok = (isinstance(i, int) and isinstance(j, int) and i != j
          and 0 <= i < len(nums) and 0 <= j < len(nums) and nums[i] + nums[j] == target)
    return ok, "two distinct indices that sum to target"
`.trim(),
};

const containsDuplicate: Question = {
  slug: "contains-duplicate",
  title: "Contains Duplicate",
  difficulty: "Easy",
  tags: ["Arrays", "Hash Set"],
  description: `
Given a list of integers \`nums\`, return \`True\` if any value shows up more than once, and \`False\` if every value is unique.

\`\`\`python
def contains_duplicate(nums: list[int]) -> bool
\`\`\`

### Example 1
\`\`\`
Input:  nums = [1, 2, 3, 1]
Output: True
\`\`\`

### Example 2
\`\`\`
Input:  nums = [1, 2, 3, 4]
Output: False
\`\`\`

### Constraints
- \`1 <= len(nums) <= 10^5\`
- \`-10^9 <= nums[i] <= 10^9\`
`.trim(),
  starter: `from typing import List


def contains_duplicate(nums: List[int]) -> bool:
    pass


if __name__ == "__main__":
    print(contains_duplicate([1, 2, 3, 1]))  # expect True
    print(contains_duplicate([1, 2, 3, 4]))  # expect False
`,
  tests: String.raw`
CASES = [
    {"name": "example 1", "func": "contains_duplicate", "args": [[1, 2, 3, 1]], "expected": True},
    {"name": "example 2", "func": "contains_duplicate", "args": [[1, 2, 3, 4]], "expected": False},
    {"name": "single element", "func": "contains_duplicate", "args": [[7]], "expected": False},
    {"name": "many repeats", "func": "contains_duplicate", "args": [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], "expected": True},
    {"name": "negatives", "func": "contains_duplicate", "args": [[-1, 0, 1, -1]], "expected": True},
    {"name": "100k unique", "func": "contains_duplicate", "args": [list(range(100000))], "expected": False},
    {"name": "100k, dup at the end", "func": "contains_duplicate", "args": [list(range(100000)) + [0]], "expected": True},
]
`.trim(),
};

const validAnagram: Question = {
  slug: "valid-anagram",
  title: "Valid Anagram",
  difficulty: "Easy",
  tags: ["Strings", "Hash Map"],
  description: `
Given two strings \`s\` and \`t\`, return \`True\` if \`t\` is an anagram of \`s\`, meaning it uses exactly the same letters the same number of times, just rearranged.

\`\`\`python
def is_anagram(s: str, t: str) -> bool
\`\`\`

### Example 1
\`\`\`
Input:  s = "anagram", t = "nagaram"
Output: True
\`\`\`

### Example 2
\`\`\`
Input:  s = "rat", t = "car"
Output: False
\`\`\`

### Constraints
- \`1 <= len(s), len(t) <= 5 * 10^4\`
- \`s\` and \`t\` are lowercase English letters.
`.trim(),
  starter: `def is_anagram(s: str, t: str) -> bool:
    pass


if __name__ == "__main__":
    print(is_anagram("anagram", "nagaram"))  # expect True
    print(is_anagram("rat", "car"))          # expect False
`,
  tests: String.raw`
CASES = [
    {"name": f"is_anagram({s!r}, {t!r})" if len(s) < 30 else f"long strings (len {len(s)})",
     "func": "is_anagram", "args": [s, t], "expected": e}
    for s, t, e in [
        ("anagram", "nagaram", True),
        ("rat", "car", False),
        ("a", "a", True),
        ("ab", "a", False),
        ("aacc", "ccac", False),
        ("listen", "silent", True),
        ("abc" * 10000, "cba" * 10000, True),
        ("abc" * 10000, "abd" * 10000, False),
    ]
]
`.trim(),
};

const binarySearch: Question = {
  slug: "binary-search",
  title: "Binary Search",
  difficulty: "Easy",
  tags: ["Arrays", "Binary Search"],
  description: `
You're given a list of distinct integers \`nums\` sorted in ascending order, and a \`target\`. Return the index of \`target\` in \`nums\`, or \`-1\` if it isn't there.

Your solution should run in **O(log n)** time.

\`\`\`python
def search(nums: list[int], target: int) -> int
\`\`\`

### Example 1
\`\`\`
Input:  nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
\`\`\`

### Example 2
\`\`\`
Input:  nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
\`\`\`

### Constraints
- \`1 <= len(nums) <= 10^6\`
- All values in \`nums\` are unique and sorted ascending.
- No \`nums.index()\` or \`bisect\`, that's the whole point.
`.trim(),
  starter: `from typing import List


def search(nums: List[int], target: int) -> int:
    pass


if __name__ == "__main__":
    print(search([-1, 0, 3, 5, 9, 12], 9))  # expect 4
    print(search([-1, 0, 3, 5, 9, 12], 2))  # expect -1
`,
  tests: String.raw`
_big = list(range(0, 2000000, 2))
CASES = [
    {"name": "example 1", "func": "search", "args": [[-1, 0, 3, 5, 9, 12], 9], "expected": 4},
    {"name": "example 2 (missing)", "func": "search", "args": [[-1, 0, 3, 5, 9, 12], 2], "expected": -1},
    {"name": "single, found", "func": "search", "args": [[5], 5], "expected": 0},
    {"name": "single, missing", "func": "search", "args": [[5], -5], "expected": -1},
    {"name": "first element", "func": "search", "args": [[1, 3, 5, 7], 1], "expected": 0},
    {"name": "last element", "func": "search", "args": [[1, 3, 5, 7], 7], "expected": 3},
    {"name": "below range", "func": "search", "args": [[1, 3, 5, 7], 0], "expected": -1},
    {"name": "above range", "func": "search", "args": [[1, 3, 5, 7], 8], "expected": -1},
    {"name": "1M elements, found", "func": "search", "args": [_big, 1234566], "expected": 617283},
    {"name": "1M elements, missing", "func": "search", "args": [_big, 1234567], "expected": -1},
]
`.trim(),
};

const climbingStairs: Question = {
  slug: "climbing-stairs",
  title: "Climbing Stairs",
  difficulty: "Easy",
  tags: ["Dynamic Programming"],
  description: `
A staircase has \`n\` steps. Each move, you can climb either **1** or **2** steps. How many different ways can you reach the top?

\`\`\`python
def climb_stairs(n: int) -> int
\`\`\`

### Example 1
\`\`\`
Input:  n = 2
Output: 2
\`\`\`
\`1 + 1\` or \`2\`.

### Example 2
\`\`\`
Input:  n = 3
Output: 3
\`\`\`
\`1 + 1 + 1\`, \`1 + 2\`, or \`2 + 1\`.

### Constraints
- \`1 <= n <= 1000\`
- Plain recursion will time out on the bigger tests. Think about what you're recomputing.
`.trim(),
  starter: `def climb_stairs(n: int) -> int:
    pass


if __name__ == "__main__":
    print(climb_stairs(2))  # expect 2
    print(climb_stairs(3))  # expect 3
`,
  tests: String.raw`
def _ref(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a

CASES = [
    {"name": f"n = {n}", "func": "climb_stairs", "args": [n], "expected": _ref(n)}
    for n in [1, 2, 3, 4, 5, 10, 20, 45, 100, 1000]
]
`.trim(),
};

const maxSubarray: Question = {
  slug: "maximum-subarray",
  title: "Maximum Subarray",
  difficulty: "Medium",
  tags: ["Arrays", "Dynamic Programming"],
  description: `
Given a list of integers \`nums\`, find the contiguous, non-empty slice with the largest sum and return that sum.

\`\`\`python
def max_subarray(nums: list[int]) -> int
\`\`\`

### Example 1
\`\`\`
Input:  nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
\`\`\`
The slice \`[4, -1, 2, 1]\` sums to 6.

### Example 2
\`\`\`
Input:  nums = [5, 4, -1, 7, 8]
Output: 23
\`\`\`

### Example 3
\`\`\`
Input:  nums = [-3, -1, -2]
Output: -1
\`\`\`
The slice can't be empty, so with all negatives you pick the largest single number.

### Constraints
- \`1 <= len(nums) <= 10^5\`
- \`-10^4 <= nums[i] <= 10^4\`
- Aim for **O(n)**.
`.trim(),
  starter: `from typing import List


def max_subarray(nums: List[int]) -> int:
    pass


if __name__ == "__main__":
    print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # expect 6
    print(max_subarray([5, 4, -1, 7, 8]))                 # expect 23
`,
  tests: String.raw`
import random
_rng = random.Random(7)
_big = [_rng.randint(-10000, 10000) for _ in range(100000)]

def _ref(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

CASES = [
    {"name": "example 1", "func": "max_subarray", "args": [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], "expected": 6},
    {"name": "example 2", "func": "max_subarray", "args": [[5, 4, -1, 7, 8]], "expected": 23},
    {"name": "all negative", "func": "max_subarray", "args": [[-3, -1, -2]], "expected": -1},
    {"name": "single", "func": "max_subarray", "args": [[1]], "expected": 1},
    {"name": "single negative", "func": "max_subarray", "args": [[-7]], "expected": -7},
    {"name": "dip in the middle", "func": "max_subarray", "args": [[3, -10, 3, 3]], "expected": 6},
    {"name": "100k random", "func": "max_subarray", "args": [_big], "expected": _ref(_big)},
]
`.trim(),
};

const productExceptSelf: Question = {
  slug: "product-of-array-except-self",
  title: "Product of Array Except Self",
  difficulty: "Medium",
  tags: ["Arrays", "Prefix Sums"],
  description: `
Given a list of integers \`nums\`, return a list \`answer\` where \`answer[i]\` is the product of every element in \`nums\` **except** \`nums[i]\`.

Do it in **O(n)** time and **without using division**.

\`\`\`python
def product_except_self(nums: list[int]) -> list[int]
\`\`\`

### Example 1
\`\`\`
Input:  nums = [1, 2, 3, 4]
Output: [24, 12, 8, 6]
\`\`\`

### Example 2
\`\`\`
Input:  nums = [-1, 1, 0, -3, 3]
Output: [0, 0, 9, 0, 0]
\`\`\`

### Constraints
- \`2 <= len(nums) <= 10^5\`
- \`-30 <= nums[i] <= 30\`
- Zeros are allowed, which is one reason division gets messy.
`.trim(),
  starter: `from typing import List


def product_except_self(nums: List[int]) -> List[int]:
    pass


if __name__ == "__main__":
    print(product_except_self([1, 2, 3, 4]))        # expect [24, 12, 8, 6]
    print(product_except_self([-1, 1, 0, -3, 3]))   # expect [0, 0, 9, 0, 0]
`,
  tests: String.raw`
import random
_rng = random.Random(3)
_big = [_rng.choice([-2, -1, 1, 2]) for _ in range(20000)]

def _ref(nums):
    n = len(nums)
    out = [1] * n
    acc = 1
    for i in range(n):
        out[i] = acc
        acc *= nums[i]
    acc = 1
    for i in range(n - 1, -1, -1):
        out[i] *= acc
        acc *= nums[i]
    return out

CASES = [
    {"name": "example 1", "func": "product_except_self", "args": [[1, 2, 3, 4]], "expected": [24, 12, 8, 6]},
    {"name": "example 2 (one zero)", "func": "product_except_self", "args": [[-1, 1, 0, -3, 3]], "expected": [0, 0, 9, 0, 0]},
    {"name": "two zeros", "func": "product_except_self", "args": [[0, 4, 0]], "expected": [0, 0, 0]},
    {"name": "two elements", "func": "product_except_self", "args": [[5, 7]], "expected": [7, 5]},
    {"name": "negatives", "func": "product_except_self", "args": [[-1, -2, -3]], "expected": [6, 3, 2]},
    {"name": "20k elements", "func": "product_except_self", "args": [_big], "expected": _ref(_big)},
]
`.trim(),
};

const longestSubstring: Question = {
  slug: "longest-substring-without-repeating-characters",
  title: "Longest Substring Without Repeating Characters",
  difficulty: "Medium",
  tags: ["Strings", "Sliding Window"],
  description: `
Given a string \`s\`, return the length of the longest substring that has no repeated characters.

A substring is a contiguous run of characters, so \`"pwke"\` doesn't count for \`"pwwkew"\`.

\`\`\`python
def length_of_longest_substring(s: str) -> int
\`\`\`

### Example 1
\`\`\`
Input:  s = "abcabcbb"
Output: 3
\`\`\`
\`"abc"\` is the longest.

### Example 2
\`\`\`
Input:  s = "bbbbb"
Output: 1
\`\`\`

### Example 3
\`\`\`
Input:  s = "pwwkew"
Output: 3
\`\`\`
\`"wke"\` is the longest.

### Constraints
- \`0 <= len(s) <= 5 * 10^4\`
- \`s\` can contain letters, digits, symbols and spaces.
`.trim(),
  starter: `def length_of_longest_substring(s: str) -> int:
    pass


if __name__ == "__main__":
    print(length_of_longest_substring("abcabcbb"))  # expect 3
    print(length_of_longest_substring("bbbbb"))     # expect 1
    print(length_of_longest_substring("pwwkew"))    # expect 3
`,
  tests: String.raw`
import string
_long = (string.ascii_letters + string.digits) * 800

CASES = [
    {"name": f"{s!r}" if len(s) < 30 else f"long string (len {len(s)})",
     "func": "length_of_longest_substring", "args": [s], "expected": e}
    for s, e in [
        ("abcabcbb", 3),
        ("bbbbb", 1),
        ("pwwkew", 3),
        ("", 0),
        (" ", 1),
        ("au", 2),
        ("dvdf", 3),
        ("abba", 2),
        ("tmmzuxt", 5),
        (_long, 62),
    ]
]
`.trim(),
};

const groupAnagrams: Question = {
  slug: "group-anagrams",
  title: "Group Anagrams",
  difficulty: "Medium",
  tags: ["Strings", "Hash Map"],
  description: `
Given a list of strings \`strs\`, group the words that are anagrams of each other. Return the groups in any order, and the words inside each group in any order.

\`\`\`python
def group_anagrams(strs: list[str]) -> list[list[str]]
\`\`\`

### Example 1
\`\`\`
Input:  strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
Output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
\`\`\`

### Example 2
\`\`\`
Input:  strs = [""]
Output: [[""]]
\`\`\`

### Constraints
- \`1 <= len(strs) <= 10^4\`
- \`0 <= len(strs[i]) <= 100\`
- Words are lowercase English letters.
`.trim(),
  starter: `from typing import List


def group_anagrams(strs: List[str]) -> List[List[str]]:
    pass


if __name__ == "__main__":
    print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
`,
  tests: String.raw`
import random
_rng = random.Random(11)
_words = ["".join(_rng.choice("abcde") for _ in range(_rng.randint(1, 5))) for _ in range(5000)]

def _norm(groups):
    return sorted(sorted(g) for g in groups)

def _ref(strs):
    d = {}
    for w in strs:
        d.setdefault("".join(sorted(w)), []).append(w)
    return list(d.values())

CASES = [
    {"name": "example 1", "func": "group_anagrams", "args": [["eat", "tea", "tan", "ate", "nat", "bat"]]},
    {"name": "empty string", "func": "group_anagrams", "args": [[""]]},
    {"name": "single word", "func": "group_anagrams", "args": [["a"]]},
    {"name": "no anagrams", "func": "group_anagrams", "args": [["abc", "def", "ghi"]]},
    {"name": "repeated words", "func": "group_anagrams", "args": [["ab", "ba", "ab"]]},
    {"name": "5k random words", "func": "group_anagrams", "args": [_words]},
]

def check(case, got):
    want = _norm(_ref(case["args"][0]))
    desc = f"{len(want)} groups (any order)"
    try:
        return _norm(got) == want, desc
    except Exception:
        return False, desc
`.trim(),
};

const topKFrequent: Question = {
  slug: "top-k-frequent-elements",
  title: "Top K Frequent Elements",
  difficulty: "Medium",
  tags: ["Hash Map", "Heap", "Bucket Sort"],
  description: `
Given a list of integers \`nums\` and an integer \`k\`, return the \`k\` values that appear most often. You can return them in any order.

The answer is guaranteed to be unique, so there are no ties at the cutoff.

\`\`\`python
def top_k_frequent(nums: list[int], k: int) -> list[int]
\`\`\`

### Example 1
\`\`\`
Input:  nums = [1, 1, 1, 2, 2, 3], k = 2
Output: [1, 2]
\`\`\`

### Example 2
\`\`\`
Input:  nums = [1], k = 1
Output: [1]
\`\`\`

### Constraints
- \`1 <= len(nums) <= 10^5\`
- \`1 <= k <=\` number of distinct values
- Sorting all the counts is O(n log n). Can you do better?
`.trim(),
  starter: `from typing import List


def top_k_frequent(nums: List[int], k: int) -> List[int]:
    pass


if __name__ == "__main__":
    print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))  # expect [1, 2]
`,
  tests: String.raw`
import random
_rng = random.Random(5)
# Value v appears (v + 1) * 3 times, so counts are all distinct.
_big = [v for v in range(200) for _ in range((v + 1) * 3)]
_rng.shuffle(_big)

CASES = [
    {"name": "example 1", "func": "top_k_frequent", "args": [[1, 1, 1, 2, 2, 3], 2], "want": [1, 2]},
    {"name": "example 2", "func": "top_k_frequent", "args": [[1], 1], "want": [1]},
    {"name": "k = all distinct", "func": "top_k_frequent", "args": [[4, 4, 5], 2], "want": [4, 5]},
    {"name": "negatives", "func": "top_k_frequent", "args": [[-1, -1, 2, 2, 2, 3], 1], "want": [2]},
    {"name": "~60k shuffled", "func": "top_k_frequent", "args": [_big, 10], "want": list(range(190, 200))},
]

def check(case, got):
    want = sorted(case["want"])
    try:
        return sorted(got) == want, f"{want} (any order)"
    except Exception:
        return False, f"{want} (any order)"
`.trim(),
};

const mergeIntervals: Question = {
  slug: "merge-intervals",
  title: "Merge Intervals",
  difficulty: "Medium",
  tags: ["Arrays", "Sorting"],
  description: `
You're given a list of intervals where \`intervals[i] = [start, end]\`. Merge every set of overlapping intervals and return the result, sorted by start.

Intervals that just touch, like \`[1, 4]\` and \`[4, 5]\`, count as overlapping.

\`\`\`python
def merge(intervals: list[list[int]]) -> list[list[int]]
\`\`\`

### Example 1
\`\`\`
Input:  intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]
Output: [[1, 6], [8, 10], [15, 18]]
\`\`\`

### Example 2
\`\`\`
Input:  intervals = [[1, 4], [4, 5]]
Output: [[1, 5]]
\`\`\`

### Constraints
- \`1 <= len(intervals) <= 10^4\`
- \`0 <= start <= end <= 10^4\`
- The input isn't necessarily sorted.
`.trim(),
  starter: `from typing import List


def merge(intervals: List[List[int]]) -> List[List[int]]:
    pass


if __name__ == "__main__":
    print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))  # expect [[1, 6], [8, 10], [15, 18]]
    print(merge([[1, 4], [4, 5]]))                     # expect [[1, 5]]
`,
  tests: String.raw`
CASES = [
    {"name": "example 1", "func": "merge", "args": [[[1, 3], [2, 6], [8, 10], [15, 18]]], "expected": [[1, 6], [8, 10], [15, 18]]},
    {"name": "example 2 (touching)", "func": "merge", "args": [[[1, 4], [4, 5]]], "expected": [[1, 5]]},
    {"name": "single", "func": "merge", "args": [[[1, 4]]], "expected": [[1, 4]]},
    {"name": "unsorted input", "func": "merge", "args": [[[8, 10], [1, 3], [2, 6]]], "expected": [[1, 6], [8, 10]]},
    {"name": "fully contained", "func": "merge", "args": [[[1, 10], [2, 3], [4, 5]]], "expected": [[1, 10]]},
    {"name": "no overlaps", "func": "merge", "args": [[[5, 6], [1, 2], [3, 4]]], "expected": [[1, 2], [3, 4], [5, 6]]},
    {"name": "zero-width", "func": "merge", "args": [[[0, 0], [1, 1], [0, 1]]], "expected": [[0, 1]]},
    {"name": "10k chained", "func": "merge", "args": [[[i, i + 1] for i in range(10000)]], "expected": [[0, 10000]]},
]
`.trim(),
};

const numIslands: Question = {
  slug: "number-of-islands",
  title: "Number of Islands",
  difficulty: "Medium",
  tags: ["Graphs", "DFS / BFS", "Grid"],
  description: `
You're given a 2D grid of \`"1"\` (land) and \`"0"\` (water). Return the number of islands.

An island is a group of land cells connected **horizontally or vertically** (not diagonally). Everything outside the grid is water.

\`\`\`python
def num_islands(grid: list[list[str]]) -> int
\`\`\`

### Example 1
\`\`\`
Input: grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1
\`\`\`

### Example 2
\`\`\`
Input: grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3
\`\`\`

### Constraints
- \`1 <= rows, cols <= 300\`
- Cells are the strings \`"0"\` or \`"1"\`.
- Watch out for Python's recursion limit on the big grids. One test is a single 90,000-cell island.
`.trim(),
  starter: `from typing import List


def num_islands(grid: List[List[str]]) -> int:
    pass


if __name__ == "__main__":
    grid = [
        ["1", "1", "0", "0", "0"],
        ["1", "1", "0", "0", "0"],
        ["0", "0", "1", "0", "0"],
        ["0", "0", "0", "1", "1"],
    ]
    print(num_islands(grid))  # expect 3
`,
  tests: String.raw`
def _g(rows):
    return [list(r) for r in rows]

_checker = [["1" if (r + c) % 2 == 0 else "0" for c in range(100)] for r in range(100)]
_solid = [["1"] * 300 for _ in range(300)]
# A single snake-shaped island that winds through the whole grid.
_snake = [["0"] * 199 for _ in range(199)]
for r in range(0, 199, 2):
    for c in range(199):
        _snake[r][c] = "1"
    if r + 1 < 199:
        _snake[r + 1][198 if (r // 2) % 2 == 0 else 0] = "1"

CASES = [
    {"name": "example 1", "func": "num_islands", "args": [_g(["11110", "11010", "11000", "00000"])], "expected": 1},
    {"name": "example 2", "func": "num_islands", "args": [_g(["11000", "11000", "00100", "00011"])], "expected": 3},
    {"name": "all water", "func": "num_islands", "args": [_g(["000", "000"])], "expected": 0},
    {"name": "single cell", "func": "num_islands", "args": [_g(["1"])], "expected": 1},
    {"name": "diagonals don't connect", "func": "num_islands", "args": [_g(["101", "010", "101"])], "expected": 5},
    {"name": "ring with a lake", "func": "num_islands", "args": [_g(["111", "101", "111"])], "expected": 1},
    {"name": "100x100 checkerboard", "func": "num_islands", "args": [_checker], "expected": 5000},
    {"name": "300x300 solid land", "func": "num_islands", "args": [_solid], "expected": 1},
    {"name": "199x199 snake", "func": "num_islands", "args": [_snake], "expected": 1},
]
`.trim(),
};

const coinChange: Question = {
  slug: "coin-change",
  title: "Coin Change",
  difficulty: "Medium",
  tags: ["Dynamic Programming"],
  description: `
You have unlimited coins of each value in \`coins\`. Return the fewest coins needed to make exactly \`amount\`. If it can't be done, return \`-1\`.

\`\`\`python
def coin_change(coins: list[int], amount: int) -> int
\`\`\`

### Example 1
\`\`\`
Input:  coins = [1, 2, 5], amount = 11
Output: 3
\`\`\`
\`5 + 5 + 1\`.

### Example 2
\`\`\`
Input:  coins = [2], amount = 3
Output: -1
\`\`\`

### Example 3
\`\`\`
Input:  coins = [1], amount = 0
Output: 0
\`\`\`

### Constraints
- \`1 <= len(coins) <= 12\`
- \`1 <= coins[i] <= 2^31 - 1\`
- \`0 <= amount <= 10^4\`
- Greedy (always take the biggest coin) doesn't work. Try \`coins = [1, 3, 4], amount = 6\`.
`.trim(),
  starter: `from typing import List


def coin_change(coins: List[int], amount: int) -> int:
    pass


if __name__ == "__main__":
    print(coin_change([1, 2, 5], 11))  # expect 3
    print(coin_change([2], 3))         # expect -1
`,
  tests: String.raw`
CASES = [
    {"name": "example 1", "func": "coin_change", "args": [[1, 2, 5], 11], "expected": 3},
    {"name": "example 2 (impossible)", "func": "coin_change", "args": [[2], 3], "expected": -1},
    {"name": "amount 0", "func": "coin_change", "args": [[1], 0], "expected": 0},
    {"name": "greedy trap", "func": "coin_change", "args": [[1, 3, 4], 6], "expected": 2},
    {"name": "unsorted coins", "func": "coin_change", "args": [[186, 419, 83, 408], 6249], "expected": 20},
    {"name": "huge coin", "func": "coin_change", "args": [[2147483647], 2], "expected": -1},
    {"name": "amount 10,000", "func": "coin_change", "args": [[1, 7, 13, 29], 10000], "expected": 348},
]
`.trim(),
};

export const QUESTIONS: Question[] = [
  garden,
  twoSum,
  stock,
  parens,
  containsDuplicate,
  validAnagram,
  binarySearch,
  climbingStairs,
  maxSubarray,
  productExceptSelf,
  longestSubstring,
  groupAnagrams,
  topKFrequent,
  mergeIntervals,
  numIslands,
  coinChange,
];

export function getQuestion(slug: string): Question | undefined {
  return QUESTIONS.find((q) => q.slug === slug);
}
