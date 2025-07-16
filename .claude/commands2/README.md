# Streamlined Development Workflow (Experimental)

This directory contains an experimental workflow designed to reduce duplication and improve timing of technical planning.

## Problem with Current Workflow

- **Issues are too verbose**: 300+ lines with technical implementation details
- **PRs repeat context**: Motivation and testing details already in issues
- **Technical planning too early**: Implementation details in issues become outdated

## New Three-Tier Architecture

### 1. Issues (PRD Focus) - 50-100 lines

- **Purpose**: Business requirements and user value
- **Contains**: Problem statement, success criteria, scope, dependencies
- **Excludes**: Technical implementation, code examples, detailed acceptance criteria
- **Template**: `ISSUE_TEMPLATE.md`
- **Command**: `create-issue.md`

### 2. Implementation Plans (Just-in-Time) - Technical Details

- **Purpose**: Detailed technical planning when ready to code
- **Contains**: Architecture decisions, implementation steps, file changes, testing strategy
- **Timing**: Generated right before coding begins
- **Storage**: `.claude/plans/issue-{number}.md`
- **Command**: `plan-implementation.md`

### 3. PRs (Changes Focus) - 50-100 lines

- **Purpose**: What changed and validation performed
- **Contains**: Summary of changes, actual testing done, breaking changes
- **Excludes**: Motivation (reference issue), generic checklists, repeated context
- **Template**: `PR_TEMPLATE.md`
- **Command**: `create-pr.md`

## Workflow Comparison

### Current Workflow

```
Issue (300+ lines) -> Coding -> PR (200+ lines)
├─ Business requirements     ├─ Repeats motivation
├─ Technical implementation  ├─ Generic checklists
├─ Code examples            ├─ Implementation context
├─ Detailed acceptance      └─ Testing details
└─ Architecture decisions
```

### New Workflow

```
Issue (50-100 lines) -> Plan (when ready) -> Coding -> PR (50-100 lines)
├─ Business requirements     ├─ Technical details     ├─ Changes made
├─ Success criteria         ├─ Implementation        ├─ Actual testing
├─ Scope boundaries         ├─ Architecture          ├─ Breaking changes
└─ Dependencies             └─ File changes          └─ Issue reference
```

## Commands Reference

### Create Issues

```bash
claude run .claude/commands2/create-issue.md
```

### Plan Implementation (when ready to code)

```bash
export ISSUE_NUMBER=123
claude run .claude/commands2/plan-implementation.md
```

### Create PRs

```bash
claude run .claude/commands2/create-pr.md
```

### Commit with Plan Reference

```bash
claude run .claude/commands2/commit.md
```

## Benefits

### For Issues

- ✅ Faster issue creation (50-100 vs 300+ lines)
- ✅ Focus on business value, not implementation
- ✅ Better product requirement documentation
- ✅ Less technical debt from outdated implementation details

### For Technical Planning

- ✅ Plans created when implementation knowledge is fresh
- ✅ Current codebase analysis at time of coding
- ✅ User review/approval before implementation starts
- ✅ Plans saved for reference in commits/PRs

### For PRs

- ✅ Faster PR creation (50-100 vs 200+ lines)
- ✅ Focus on changes made, not justification
- ✅ Reduced duplication with issues
- ✅ Actual testing performed vs generic checklists

## Testing This Workflow

1. **Create test issue** using new command and compare length/content to current issues
2. **Generate implementation plan** when ready to code and compare to baked-in technical details
3. **Create PR** using streamlined template and compare duplication level

## Migration Strategy

- Keep existing `/commands/` intact during testing
- Use `/commands2/` for experimental workflow
- Compare results and iterate on approach
- Migrate successful patterns back to main commands when proven
