# mcp-app-padel

Local MCP server for the AppPadel project.

## Run

```bash
npm run mcp:app-padel
```

## Tools

- `app_context`: returns project and MVP context.
- `openspec_change`: reads the OpenSpec MVP artifacts.
- `env_keys`: lists expected environment variable names without exposing values.

## Codex Config Example

Register the server in Codex with a command equivalent to:

```toml
[mcp_servers.mcp-app-padel]
command = "npm"
args = ["run", "mcp:app-padel"]
cwd = "C:\\Proyectos\\AppPadel\\app-padel"
```

