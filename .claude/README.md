# Claude Code Configuration

This directory contains configuration for Claude Code, an AI coding assistant.

## Structure

```
.claude/
├── README.md                 # This file
├── settings.local.json       # Local Claude Code settings
├── agents/                   # Custom Claude agents
│   └── add-chain-to-safe.md # Agent for adding chain IDs to Safe deployments
└── commands/                 # Custom slash commands
    └── (add custom commands here)
```

## Agents

### @add-chain-to-safe
Automated agent for adding new chain IDs to Safe wallet deployments.

**Usage:**
```
@add-chain-to-safe
```

The agent will guide you through:
1. Specifying chain ID and Safe version
2. Choosing default or custom addresses
3. Patching all node_modules packages
4. Generating patch files
5. Creating a git commit

## Custom Commands

You can add custom slash commands in the `commands/` directory. Each command should be a markdown file that defines the prompt.

Example: `.claude/commands/review-pr.md`
```markdown
Review the pull request and provide feedback on:
- Code quality
- Test coverage
- Security concerns
- Performance implications
```

Then use it with `/review-pr`

## Settings

The `settings.local.json` file contains your local Claude Code preferences. This file is git-ignored.

## Documentation

- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Creating Custom Agents](https://docs.claude.com/claude-code/agents)
- [Custom Commands Guide](https://docs.claude.com/claude-code/commands)
