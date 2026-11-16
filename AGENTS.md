# Architecture rules

- Create caller-scoped MCP database clients inside the typed tool handler after checking runtime configuration; the generated Deno bundle strips standalone helper annotations, while SDK handlers retain contextual typing.
- Tournament families are database-managed; explicit event brand links take precedence over legacy title matching so names can change without losing editions.
- Local and national stages use separate events linked per category; transfer registrations and rosters atomically, preserving identities and starting national standings fresh, so existing knockout rules stay isolated.