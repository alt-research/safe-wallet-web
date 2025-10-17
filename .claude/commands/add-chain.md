Launch the add-chain-to-safe agent to add a new chain ID to Safe wallet deployments.

Use the Task tool with subagent_type "general-purpose" and load the agent instructions from .claude/agents/add-chain-to-safe.md.

The agent will:
1. Ask for chain ID, Safe version, and addresses
2. Find all safe-deployments packages
3. Update contract JSON files
4. Generate patch files
5. Create git commit

Invoke: @add-chain-to-safe
