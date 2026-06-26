```markdown
# dungeon Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to contribute to the `dungeon` JavaScript codebase, which is structured without a framework and follows specific conventions for file naming, module imports/exports, and testing. You'll learn how to write, organize, and test code in a way that's consistent with the project's established patterns.

## Coding Conventions

### File Naming
- Use **snake_case** for all file names.
  - Example: `player_stats.js`, `dungeon_map.js`

### Import Style
- Use **relative imports** for all modules.
  - Example:
    ```javascript
    import { calculate_damage } from './combat_utils.js';
    ```

### Export Style
- Use **named exports** in all modules.
  - Example:
    ```javascript
    // In combat_utils.js
    export function calculate_damage(attack, defense) {
      // ...
    }
    ```

### Commit Messages
- Commit messages are **freeform** with no strict prefixes.
- Average commit message length: ~29 characters.
  - Example: `fix monster spawn logic`

## Workflows

### Adding a New Feature
**Trigger:** When you need to implement a new capability or module  
**Command:** `/add-feature`

1. Create a new file using snake_case (e.g., `new_feature.js`).
2. Write your code using named exports.
3. Import dependencies using relative paths.
4. Add or update tests in a corresponding `*.test.*` file.
5. Commit your changes with a clear, concise message.

### Fixing a Bug
**Trigger:** When you need to resolve a defect  
**Command:** `/fix-bug`

1. Locate the relevant module(s) using snake_case naming.
2. Make your fix, ensuring you use named exports.
3. Update or add tests to cover the bug.
4. Commit with a descriptive message.

### Running Tests
**Trigger:** To verify code correctness  
**Command:** `/run-tests`

1. Identify test files (pattern: `*.test.*`).
2. Use the project's testing tool (framework unknown; check project docs or scripts).
3. Run all tests and review results.

## Testing Patterns

- Test files follow the `*.test.*` pattern (e.g., `combat_utils.test.js`).
- The testing framework is not explicitly defined; check for scripts or documentation in the project for specifics.
- Place tests alongside or near the modules they cover.

  Example test file:
  ```javascript
  // combat_utils.test.js
  import { calculate_damage } from './combat_utils.js';

  test('calculate_damage returns correct value', () => {
    expect(calculate_damage(10, 5)).toBe(5);
  });
  ```

## Commands
| Command      | Purpose                                 |
|--------------|-----------------------------------------|
| /add-feature | Start the process to add a new feature  |
| /fix-bug     | Begin fixing a bug in the codebase      |
| /run-tests   | Run all tests in the repository         |
```
