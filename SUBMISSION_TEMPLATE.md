# Submission: [Your Name]

## Time Spent

Total time: **\4h\30m** (approximate)

## Ticket Triage

### Tickets I Addressed

List the ticket numbers you worked on, in the order you addressed them:

1. **CFG-148**: Bug was caused by mutating React state directly, leading to inconsistent state during async price calculation. Fixed by using immutable updates.
2. **CFG-142**: Fixed race condition in async price calculation - implemented request tracking using requestId to ensure only the latest response updates the UI.
3. **CFG-143**: I focused on identifying potential sources of memory growth and unnecessary work during longer configurator sessions. Using Chrome DevTools, I compared heap snapshots taken before interaction and after several minutes of configuration changes and window resizes. The comparison showed a steady increase in retained objects related to event handling, suggesting that some listeners or references were not being released correctly. The primary issue I identified was event listeners being attached repeatedly without proper cleanup - over time this caused unnecessary objects to remain in memory and led to increasing UI sluggishness. I fixed this by ensuring that all event listeners registered during the component lifecycle are properly removed during cleanup.
4. **CFG-147**: The root cause of the issue is the API implementation using btoa without proper UTF-8 handling, which throws an error when configuration values contain Unicode characters (such as Polish characters or emojis). The correct long term fix would be to update the API logic to properly support UTF-8 before Base64 encoding. I treated this as an external API limitation and applied a minimal, defensive workaround on the client side. In a real-life scenario, I would also clearly document the root cause and the expected backend fix.
5. **CFG-150**: I tried to recreate the bug by switching to mobile view using Chrome DevTools and resizing the window maually. I also added more color options to the mock product and analyzed column calculations but have not been able to find any mistakes. In a real-life situation I would ask for more details, the screenshot attached to the task and UX desings to view expected result.

### Tickets I Deprioritized

List tickets you intentionally skipped and why:

| Ticket  | Reason                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| CFG-153 | This is a big feature estimated for 2 - 3 weeks with no technical or UX details provided. Impossible to finish in 4 hours      |
| CFG-149 | Nice to have but not as important as other tickets (might not be noticeable)                                                   |
| CFG-146 | Low priority                                                                                                                   |
| CFG-151 | Requires error mapping strategy - not solvable purely at code level without UX guidance.                                       |
| CFG-152 | Important long-term accessibility work, but broad in scope and hard to complete properly within a limited 4-hour time frame.   |
| CFG-156 | Developer-experience cleanup (warnings only). Low user impact and not related to reported functional issues.                   |
| CFG-157 | Larger UX flow change requiring new state tracking and confirmation UI. Valuable, but beyond the scope of targeted bug fixing. |

### Tickets That Need Clarification

List any tickets where you couldn't proceed due to ambiguity:

| Ticket  | Question                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-144 | This ticket directly conflicts with CFG-145, which requests complete removal of the Quick Add feature. Clarification is needed on whether Quick Add should be removed or improved.                                  |
| CFG-145 | This ticket directly conflicts with CFG-144, which requests complete removal of the Quick Add feature. Clarification is needed on whether Quick Add should be removed or improved.                                  |
| CFG-154 | It is unclear whether the discount logic is actually incorrect or if only the UI copy should be updated to reflect the intended threshold. Communication confusion needs to be resolved before working on the task. |
|         |                                                                                                                                                                                                                     |

---

## Technical Write-Up

### Critical Issues Found

Describe the most important bugs you identified:

#### Issue 1: [Problems with price calculations]

**Ticket(s):** CFG-142

**What was the bug?**

Price was never changing - it always showed the initial value.

**How did you find it?**

I tried making configurations with differently valued options, lookd at the logs in the console and analyzed the code - specifically the usePriceCalculation hook.

**How did you fix it?**

I created a request order guard using a ref-based request identifier. Previous solution incorrectly compared two different data types - request starting time to the request id. Now each price calculation increments the request id, and only the latest request is allowed to update the state. Outdated responses are ignored.

**Why this approach?**

This solution directly addresses the race condition without restructuring the pricing API or overengineering the hook.

---

#### Issue 2: [Mutating state]

**Ticket(s):** CFG-148

**What was the bug?**

React state related to selected add-ons was being mutated directly, which violated React's immutability requirements.

**How did you find it?**

I was initially unable to reliably reproduce the crash using the exact steps from the ticket. I started investigating based on the error message (.price being read from undefined) and traced all code paths where add-ons are added or removed starting fron the '.price' occurrences. During code review, I noticed that the selectedAddOns state was being mutated directly using splice and then passed back into setSelectedAddOns. This breaks React's immutability assumptions and can lead to inconsistent state, especially during rapid or chained updates.

**How did you fix it?**

I replaced the mutation with an immutable update using a functional state setter. Dependent add-ons are now removed via array filtering based on IDs, ensuring React always receives a new state reference.

**Why this approach?**

Even though the crash was hard to reproduce, mutating React state is a known anti-pattern that can cause unpredictable behavior over time. Fixing this removes an entire class of bugs and aligns the code with React best practices, making the behavior deterministic and safe.

---

### Other Changes Made

Brief description of any other modifications:

- Cleaned up event listener handling related to window resize to prevent accumulation over time.
- Added exception catching to the share link generation.

---

## Code Quality Notes

### Things I Noticed But Didn't Fix

List any issues you noticed but intentionally left:

| Issue                                                                                                                                                | Why I Left It |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Unused and bugged block of code (useDebouncedPriceCalculation)                                                                                       | out of scope  |
| Wrong dependencies in useEffect dependency array in usePriceCalculation (config?.selections, config?.addOns, config?.quantity instead of fetchPrice) | out of scope  |
| Unstable currentConfig object recreated frequently                                                                                                   | time          |
| Preview generation triggered far too frequently                                                                                                      | time          |
| Use of array indices as keys                                                                                                                         | time          |
| Monolithic structure of PriceConfigurator                                                                                                            | out of scope  |

### Potential Improvements for the Future

If you had more time, what would you improve?

1. I would fix more issues related to the memory usage and over-time efficiency.
2. I would work on more tasks related to the UX.

---

## Questions for the Team

Questions you would ask in a real scenario:

1. I would ask about the Quick Add feature - whether to fix it or remove and and about other tickets that needed clarification.
2. I would ask about the UX mockups available for the UX-related issues.

---

## Assumptions Made

List any assumptions you made to proceed:

1. I assumed that proper UTF-8 handling should be implemented on the backend, not patched extensively on the frontend.
2. I assumed that I should not modify the api mock up.
3. Code unrelated to reported tickets should not be refactored.

---

## Self-Assessment

### What went well?

I was able to analyze client needs and importance of the issues.

### What was challenging?

It was challenging to recreate some of the issues and analyze the monolithic structure of the ProductConfigurator.

### What would you do differently with more time?

I would address additional low effort fixes discovered during analysis (such as incorrect useEffect dependencies) and focus more deeply on long-term performance optimization.

---

## Additional Notes

Anything else you want us to know:

The task was challenging but also engaging.
