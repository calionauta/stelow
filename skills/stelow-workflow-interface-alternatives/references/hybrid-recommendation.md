# Hybrid Recommendation Phase

After generating all proposals:

1. Evaluate the strengths and weaknesses of each proposal in context
2. Identify compatible patterns that can be combined coherently
3. Recommend:
   - one primary direction
   - optional secondary traits borrowed from others
4. Explicitly explain:
   - what should NOT be combined
   - which trade-offs are intentionally preserved

The hybrid recommendation must remain coherent.

## The hybrid carries its own wireframe

A hybrid is a *layout*, and the interface gate reviews wireframes. A hybrid
written only as prose cannot be reviewed at that gate, cannot be compared
against the proposals it merges, and leaves the reader — who arrived from the
hybrid option — with no mockup at all while the proposals it borrows from sit
elsewhere in the file.

So the hybrid section must contain:

1. **Its own composed wireframe**, in a fenced block, drawn as the combination
   actually looks — not "combine A and C" and not a copy of either. If the
   composition is a real layout, it has a shape worth drawing.
2. **The proposals it composes, named**, each with the heading a reader can jump
   to, so the full proposal remains one step away. A reader who lands on the
   hybrid option and finds no mockup should be able to reach the two mockups it
   merges without scrolling the whole file to guess.

State the borrow explicitly — what comes from which proposal, and what is
sacrificed to make the combination coherent. That is the part a reviewer cannot
infer from the wireframe.

Avoid:
- feature soup
- contradictory interaction models
- "best of all worlds" synthesis

The recommendation should feel strategically opinionated.
When presenting selectable options later, prioritize the recommended hybrid as the first option in the selection list whenever possible.

The recommendation should act as the default strategic convergence point unless the user explicitly prefers another direction.
