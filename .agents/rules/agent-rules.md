# Dvora HQ Agent Instructions: Development & Code Quality Guidelines

This document outlines key technical decisions, code quality constraints, and workflows. Any agent working on this repository must strictly adhere to these rules.

---

## 1. Language Constraints
* **User Communication**: The agent MUST always communicate and respond to the USER in Russian.
* **Codebase & Documentation**: All files in the repository—including source code, variable/function names, inline comments, JSDoc strings, logs, and markdown files—must be written **STRICTLY in English**. Do not mix languages inside the codebase.

---

## 2. Validation Pipeline & Code Quality
Before completing any task, compiling, or verifying success:
1. **Lint compliance**: Ensure there are no static analysis errors.
2. **Build compliance**: Compile/run the project to verify functionality.
3. **Strict Lint & Compiler Compliance**: Do NOT suppress lint errors or compiler checks using comments like `// eslint-disable-next-line`, `/* eslint-disable */`, `// @ts-ignore`, `// @ts-nocheck`, or excessive `any` casting. Find a proper, type-safe, and clean code solution that satisfies both linters and compilers without silencing warnings.
4. **Conventional Commits**: Every commit message must start with a lowercase Conventional Commits prefix matching the change type (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

---

## 3. Collaborative Testing & Interactive Verification
Once development phases are completed:
* Provide interactive verification scripts or testing steps that the developer can easily execute.
* Print clear, formatted diagnostic logs or summaries during tests so the developer can visually confirm that the database, API, and UI state layers function perfectly.
* Walk through verification results step-by-step with the developer, explaining exactly how to run, observe, and validate.
