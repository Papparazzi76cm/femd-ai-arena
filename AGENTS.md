# Architecture rules

- Create caller-scoped MCP database clients inside the typed tool handler after checking runtime configuration; the generated Deno bundle strips standalone helper annotations, while SDK handlers retain contextual typing.