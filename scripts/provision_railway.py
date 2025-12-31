#!/usr/bin/env python3
"""
Provision the full Railway stack for Liminal using the public GraphQL API.

The script is intentionally idempotent: run it any time the desired configuration
changes and it will create/update the required Railway resources instead of
forcing manual tweaks in the UI.

Usage:
    export RAILWAY_TOKEN=<personal access token from https://railway.app/account/tokens>
    export PROD_FRONTEND_URL=https://<frontend-domain>
    export PROD_BACKEND_URL=https://<backend-domain>
    export PROD_KEYCLOAK_URL=https://<keycloak-domain>
    export SECRET_KEY=<fastapi-secret>
    export KEYCLOAK_ADMIN_PASSWORD=<strong-password>
    export LLM_BASE_URL=...
    export LLM_MODEL=...
    export LLM_PROVIDER=...
    export NEXT_PUBLIC_OIDC_PROVIDERS="default=Continue with Liminal##google=Continue with Google"
    python scripts/provision_railway.py --config infra/railway/stack.json

The implementation talks directly to Railway's GraphQL endpoint so the same
configuration can be replayed without touching the dashboard.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

GRAPHQL_ENDPOINT = "https://backboard.railway.app/graphql/v2"


class RailwayError(RuntimeError):
    """Raised when the Railway GraphQL API returns errors."""


class RailwayAPI:
    """Thin wrapper around the Railway GraphQL endpoint."""

    def __init__(self, token: str, dry_run: bool = False) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "authorization": f"Bearer {token}",
                "content-type": "application/json",
            }
        )
        self.dry_run = dry_run

    def execute(self, query: str, variables: Optional[dict] = None) -> dict:
        payload = {"query": query, "variables": variables or {}}
        if self.dry_run:
            print("\n--- GRAPHQL (dry-run) ---")
            print(json.dumps(payload, indent=2))
            return {}

        resp = self.session.post(GRAPHQL_ENDPOINT, json=payload, timeout=60)
        try:
            resp.raise_for_status()
        except requests.HTTPError as exc:
            raise RailwayError(f"HTTP {resp.status_code} {resp.text}") from exc

        data = resp.json()
        if "errors" in data:
            raise RailwayError(json.dumps(data["errors"], indent=2))
        return data.get("data", {})

    # -------- Project / Environment discovery -------- #

    def fetch_project_snapshot(self) -> dict:
        query = """
        query MeProjects {
          me {
            workspaces {
              id
              name
            }
            projects {
              edges {
                node {
                  id
                  name
                  environments {
                    edges {
                      node {
                        id
                        name
                      }
                    }
                  }
                  services {
                    edges {
                      node {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        result = self.execute(query)
        return result.get("me", {})

    def fetch_workspace_detail(self, workspace_id: str) -> dict:
        query = """
        query WorkspaceDetail($workspaceId: String!) {
          workspace(workspaceId: $workspaceId) {
            id
            name
            projects {
              edges {
                node {
                  id
                  name
                  environments {
                    edges {
                      node {
                        id
                        name
                      }
                    }
                  }
                  services {
                    edges {
                      node {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        data = self.execute(query, {"workspaceId": workspace_id})
        return data.get("workspace", {})

    def create_project(self, name: str, workspace_id: Optional[str] = None) -> str:
        mutation = """
        mutation CreateProject($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            id
            name
          }
        }
        """
        payload = {"name": name}
        if workspace_id:
            payload["workspaceId"] = workspace_id
        data = self.execute(mutation, {"input": payload})
        return data["projectCreate"]["id"]

    def create_environment(self, project_id: str, name: str) -> str:
        mutation = """
        mutation CreateEnvironment($input: EnvironmentCreateInput!) {
          environmentCreate(input: $input) {
            id
            name
          }
        }
        """
        data = self.execute(mutation, {"input": {"projectId": project_id, "name": name}})
        return data["environmentCreate"]["id"]

    # -------- Services / Plugins / Variables -------- #

    def create_service(self, project_id: str, name: str) -> str:
        mutation = """
        mutation CreateService($input: ServiceCreateInput!) {
          serviceCreate(input: $input) {
            id
            name
          }
        }
        """
        data = self.execute(mutation, {"input": {"projectId": project_id, "name": name}})
        return data["serviceCreate"]["id"]

    def update_service_build(self, service_id: str, config: dict) -> None:
        mutation = """
        mutation UpdateService($input: ServiceUpdateInput!) {
          serviceUpdate(input: $input) {
            id
          }
        }
        """
        payload = {"id": service_id}
        payload.update(config)
        self.execute(mutation, {"input": payload})

    def upsert_variable(self, service_id: str, environment_id: str, name: str, value: str) -> None:
        mutation = """
        mutation UpsertVariable($input: VariableUpsertInput!) {
          variableUpsert(input: $input) {
            id
            name
          }
        }
        """
        self.execute(
            mutation,
            {
                "input": {
                    "serviceId": service_id,
                    "environmentId": environment_id,
                    "name": name,
                    "value": value,
                }
            },
        )

    def create_plugin(self, project_id: str, environment_id: str, name: str, plugin: str) -> str:
        mutation = """
        mutation CreatePlugin($input: PluginCreateInput!) {
          pluginCreate(input: $input) {
            id
            name
          }
        }
        """
        data = self.execute(
            mutation,
            {
                "input": {
                    "projectId": project_id,
                    "environmentId": environment_id,
                    "name": name,
                    "plugin": plugin,
                }
            },
        )
        return data["pluginCreate"]["id"]

    def fetch_environment_services(self, environment_id: str) -> List[dict]:
        query = """
        query EnvServices($environmentId: String!) {
          environment(id: $environmentId) {
            deployments {
              edges {
                node {
                  serviceId
                  service {
                    id
                    name
                  }
                }
              }
            }
          }
        }
        """
        data = self.execute(query, {"environmentId": environment_id})
        edges = data.get("environment", {}).get("deployments", {}).get("edges", [])
        services = []
        for edge in edges:
            node = edge.get("node", {})
            services.append(
                {
                    "name": node.get("service", {}).get("name"),
                    "service": {
                        "id": node.get("serviceId"),
                        "name": node.get("service", {}).get("name"),
                    },
                }
            )
        return services
        return services

    def fetch_service_variables(self, service_id: str, environment_id: str) -> Dict[str, str]:
        query = """
        query ServiceVariables($serviceId: ID!, $environmentId: ID!) {
          service(id: $serviceId) {
            environment(id: $environmentId) {
              variables {
                edges {
                  node {
                    name
                    value
                  }
                }
              }
            }
          }
        }
        """
        data = self.execute(query, {"serviceId": service_id, "environmentId": environment_id})
        variables = {}
        try:
            edges = data["service"]["environment"]["variables"]["edges"]
        except (KeyError, TypeError):
            return variables
        for edge in edges:
            node = edge.get("node", {})
            if node.get("name"):
                variables[node["name"]] = node.get("value", "")
        return variables


# ----------------- Helper structures ----------------- #


@dataclass
class DatabaseRef:
    name: str
    service_name: str
    plugin: str
    service_id: Optional[str] = None
    variables: Optional[Dict[str, str]] = None


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


TOKEN_HELP = "Railway personal access token (env: RAILWAY_TOKEN)."


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision Railway infrastructure for Liminal.")
    parser.add_argument("--config", default="infra/railway/stack.json", help="Path to the stack JSON file.")
    parser.add_argument("--token", default=os.getenv("RAILWAY_TOKEN"), help=TOKEN_HELP)
    parser.add_argument(
        "--env-file",
        help="Optional .env.* file. Values are merged with the current environment (process env overrides file).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print GraphQL calls without executing them.")
    return parser.parse_args()


def parse_env_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    with path.open("r", encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


# ----------------- Template rendering ----------------- #

TOKEN_PATTERN = re.compile(r"\$\{([^}]+)\}")


def render_template(value: str, env: Dict[str, str], db_lookup: Dict[str, DatabaseRef]) -> str:
    """Simple ${env.VAR} / ${db.NAME.field} interpolation."""

    def replace(match: re.Match[str]) -> str:
        token = match.group(1)
        source = token
        default = None
        if "|" in token:
            source, default = token.split("|", 1)
            if default.startswith("default="):
                default = default[len("default=") :]
        if source.startswith("env."):
            key = source[4:]
            return env.get(key) or default or ""
        if source.startswith("db."):
            parts = source.split(".")
            if len(parts) < 3:
                raise ValueError(f"Invalid db token: {token}")
            db_name = parts[1]
            field = parts[2]
            db = db_lookup.get(db_name)
            if not db or not db.variables:
                return default or ""
            mapping = {
                "host": db.variables.get("PGHOST") or db.variables.get("HOST"),
                "port": db.variables.get("PGPORT") or db.variables.get("PORT"),
                "user": db.variables.get("PGUSER") or db.variables.get("USER"),
                "password": db.variables.get("PGPASSWORD") or db.variables.get("PASSWORD"),
                "database": db.variables.get("PGDATABASE") or db.variables.get("DATABASE"),
                "url": db.variables.get("DATABASE_URL"),
            }
            value = mapping.get(field)
            return value or default or ""
        raise ValueError(f"Unsupported template source '{token}'")

    return TOKEN_PATTERN.sub(replace, value)


# ----------------- Provisioning logic ----------------- #


def pick_project(snapshot: dict, name: str) -> Optional[dict]:
    edges = snapshot.get("projects", {}).get("edges", [])
    nodes = [edge.get("node", {}) for edge in edges] if edges else snapshot.get("projects", {}).get("nodes", [])
    for node in nodes:
        if node.get("name") == name:
            return node
    return None


def pick_environment(project: dict, env_name: str) -> Optional[dict]:
    edges = project.get("environments", {}).get("edges", [])
    nodes = [edge.get("node", {}) for edge in edges] if edges else project.get("environments", {}).get("nodes", [])
    for node in nodes:
        if node.get("name") == env_name:
            return node
    return None


def pick_service(project: dict, service_name: str) -> Optional[dict]:
    edges = project.get("services", {}).get("edges", [])
    nodes = [edge.get("node", {}) for edge in edges] if edges else project.get("services", {}).get("nodes", [])
    for node in nodes:
        if node.get("name") == service_name:
            return node
    return None


def append_node(container: dict, node: dict) -> None:
    if "edges" in container:
        container.setdefault("edges", []).append({"node": node})
    elif "nodes" in container:
        container.setdefault("nodes", []).append(node)
    else:
        container["nodes"] = [node]


def pick_workspace(snapshot: dict, workspace_name: Optional[str]) -> dict:
    workspaces = snapshot.get("workspaces") or []
    nodes: List[dict] = []
    if isinstance(workspaces, list):
        nodes = workspaces
    elif isinstance(workspaces, dict):
        if "edges" in workspaces:
            nodes = [edge.get("node", {}) for edge in workspaces.get("edges", [])]
        elif "nodes" in workspaces:
            nodes = workspaces.get("nodes", [])
    if not nodes:
        raise RailwayError("No workspaces available on this Railway account.")
    if workspace_name:
        for node in nodes:
            if node.get("name") == workspace_name:
                return node
        names = [node.get("name") for node in nodes]
        raise RailwayError(f"Workspace '{workspace_name}' not found. Available: {names}")
    return nodes[0]


def ensure_project_and_env(api: RailwayAPI, project_name: str, env_name: str, workspace_name: Optional[str]) -> tuple[str, str, dict]:
    snapshot = api.fetch_project_snapshot()
    me_snapshot = snapshot
    workspace = pick_workspace(me_snapshot, workspace_name)
    workspace_id = workspace.get("id")

    workspace_detail = api.fetch_workspace_detail(workspace_id)
    project_container = {"projects": workspace_detail.get("projects", {})}
    project = pick_project(project_container, project_name)

    if not project:
        print(f"Creating project '{project_name}' in workspace '{workspace.get('name')}'")
        project_id = api.create_project(project_name, workspace_id)
        workspace_detail = api.fetch_workspace_detail(workspace_id)
        project_container = {"projects": workspace_detail.get("projects", {})}
        project = pick_project(project_container, project_name)
        if not project:
            project = {
                "id": project_id,
                "name": project_name,
                "environments": {"edges": [], "nodes": []},
                "services": {"edges": [], "nodes": []},
            }
        else:
            project_id = project["id"]
    else:
        project_id = project["id"]

    environment = pick_environment(project, env_name)
    if not environment:
        print(f"Creating environment '{env_name}'")
        env_id = api.create_environment(project_id, env_name)
        workspace_detail = api.fetch_workspace_detail(workspace_id)
        project_container = {"projects": workspace_detail.get("projects", {})}
        project = pick_project(project_container, project_name) or project
        environment = pick_environment(project, env_name)
        if not environment:
            environment = {"id": env_id, "name": env_name}
            append_node(project.setdefault("environments", {}), environment)
    env_id = environment["id"]
    return project_id, env_id, project


def ensure_database_services(
    api: RailwayAPI, project_id: str, env_id: str, project_snapshot: dict, db_specs: List[DatabaseRef], workspace_id: str
) -> Dict[str, DatabaseRef]:
    db_lookup: Dict[str, DatabaseRef] = {}
    for spec in db_specs:
        existing = pick_service(project_snapshot, spec.service_name)
        if existing:
            service_id = existing["id"]
        else:
            # Check if plugin already exists for this environment
            plugins = api.fetch_environment_services(env_id)
            matched_plugin = next(
                (plugin for plugin in plugins if plugin.get("name") == spec.service_name), None
            )
            if matched_plugin and matched_plugin.get("service"):
                service_id = matched_plugin["service"]["id"]
            else:
                print(f"Creating database plugin '{spec.service_name}' ({spec.plugin})")
                try:
                    api.create_plugin(project_id, env_id, spec.service_name, spec.plugin)
                except RailwayError as exc:
                    if "Problem processing request" in str(exc):
                        print(
                            f"Plugin '{spec.service_name}' might already exist; continuing with lookup."
                        )
                    else:
                        raise
                plugins = api.fetch_environment_services(env_id)
                matched_plugin = next(
                    (plugin for plugin in plugins if plugin.get("name") == spec.service_name), None
                )
                if matched_plugin and matched_plugin.get("service"):
                    service_id = matched_plugin["service"]["id"]
                else:
                    raise RailwayError(
                        f"Plugin '{spec.service_name}' creation did not expose a service. Please verify in Railway UI."
                    )
        spec.service_id = service_id
        spec.variables = api.fetch_service_variables(service_id, env_id)
        db_lookup[spec.name] = spec
    return db_lookup


def ensure_service(
    api: RailwayAPI,
    project_id: str,
    env_id: str,
    project_snapshot: dict,
    service_spec: dict,
    env_values: Dict[str, str],
    db_lookup: Dict[str, DatabaseRef],
) -> None:
    name = service_spec["name"]
    service = pick_service(project_snapshot, name)
    if not service:
        print(f"Creating service '{name}'")
        service_id = api.create_service(project_id, name)
        service = {"id": service_id, "name": name}
        append_node(project_snapshot.setdefault("services", {}), service)
    else:
        service_id = service["id"]

    builder = service_spec.get("builder", "NIXPACKS")
    build_payload: Dict[str, Any] = {
        "builder": builder,
        "serviceId": service_id,
    }
    if builder == "DOCKERFILE":
        build_payload["dockerfilePath"] = str(service_spec.get("dockerfile", "Dockerfile"))
    else:
        build_payload["rootDirectory"] = service_spec.get("root", ".")
        if service_spec.get("buildCommand"):
            build_payload["buildCommand"] = service_spec["buildCommand"]
        if service_spec.get("startCommand"):
            build_payload["startCommand"] = service_spec["startCommand"]
    api.update_service_build(service_id, build_payload)

    variables = service_spec.get("variables", {})
    for key, raw_value in variables.items():
        rendered = render_template(str(raw_value), env_values, db_lookup)
        if not rendered:
            raise RuntimeError(f"Variable '{key}' for service '{name}' resolved to an empty string.")
        api.upsert_variable(service_id, env_id, key, rendered)


def main() -> None:
    args = parse_args()
    config_path = Path(args.config)
    if not config_path.is_file():
        raise SystemExit(f"Config file not found: {config_path}")

    env_file_values: Dict[str, str] = {}
    if args.env_file:
        env_file = Path(args.env_file)
        if not env_file.is_file():
            raise SystemExit(f"Env file not found: {env_file}")
        env_file_values = parse_env_file(env_file)

    merged_env = dict(env_file_values)
    merged_env.update(os.environ)

    token = args.token or merged_env.get("RAILWAY_TOKEN")
    if not token:
        raise SystemExit("RAILWAY_TOKEN is required (set env, env-file, or pass --token).")

    config = load_config(config_path)
    api = RailwayAPI(token, dry_run=args.dry_run)

    project_name = config["project"]
    environment_name = config["environment"]
    workspace_name = config.get("workspace") or merged_env.get("RAILWAY_WORKSPACE")
    project_id, env_id, project_snapshot = ensure_project_and_env(api, project_name, environment_name, workspace_name)
    workspace_context = pick_workspace(api.fetch_project_snapshot(), workspace_name)
    workspace_id = workspace_context.get("id")
    workspace_detail = api.fetch_workspace_detail(workspace_id)
    project_snapshot = pick_project({"projects": workspace_detail.get("projects", {})}, project_name) or project_snapshot

    db_specs = [
        DatabaseRef(
            name=db["name"],
            service_name=db["serviceName"],
            plugin=db.get("plugin", "postgresql"),
        )
        for db in config.get("databases", [])
    ]
    db_lookup = ensure_database_services(api, project_id, env_id, project_snapshot, db_specs, workspace_id)

    env_values = merged_env
    for service in config.get("services", []):
        ensure_service(api, project_id, env_id, project_snapshot, service, env_values, db_lookup)

    print("✅ Railway stack definition applied.")


if __name__ == "__main__":
    try:
        main()
    except RailwayError as exc:
        print(f"Railway API error: {exc}", file=sys.stderr)
        sys.exit(1)
