import JSZip from 'jszip';

/**
 * Creates a sample mock GitHub Docs repository ZIP in memory for instant testing
 */
export async function generateDemoGitHubZip(): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip();

  const repoFolder = 'acme-project-main';

  // Sample files mirroring real GitHub documentation tree with MDX, MD, and asset links
  const sampleDocs = [
    {
      path: `${repoFolder}/README.md`,
      content: `# Acme Developer Documentation

Welcome to the developer documentation for Acme Platform.

![Acme Platform Architecture](./assets/acme-hero-banner.png)

## Overview
This suite provides modern tooling for microservices and cloud deployments.

### Key Features
- Ultra fast throughput
- Distributed tracing
- Zero-trust security

[Download Complete PDF Manual](./assets/acme-manual-v1.pdf)`,
    },
    {
      path: `${repoFolder}/docs/getting-started/quickstart.md`,
      content: `# Quickstart Guide { #quickstart-guide }

Get up and running in less than 5 minutes.

//// tab | Python 3.10+
\`\`\`python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}
\`\`\`
////

//// tab | Python 3.9+
\`\`\`python
from typing import Union
from fastapi import FastAPI

app = FastAPI()
\`\`\`
////

## Dependencies Example

The same example would look like:

{* ../../docs_src/dependencies/tutorial004_an_py310.py hl[19] *}

...and **FastAPI** will know what to do.

/// tip
Prefer to use the \`Annotated\` version if possible.
///

/// warning
This is a more advanced use case. Feel free to skip it.
///

## Initial Setup { #initial-setup }
Ensure Python 3.10+ is installed on your local workstation.

\`\`\`bash
$ <font color="#4E9A06">fastapi</font> run <u style="text-decoration-style:solid">main.py</u>
\`\`\`

![CLI Setup Workflow](../images/cli-workflow.svg)

### Verification
Run \`acme status\` to confirm connectivity with the mesh cluster.`,
    },
    {
      path: `${repoFolder}/docs/getting-started/installation.mdx`,
      content: `import { Button } from '@acme/components';
import './styles/docs.css';

export const meta = {
  title: "Installation & Setup Guide",
  description: "Step by step environment bootstrapping"
};

# Installation Instructions

<Badge label="v2.4 LTS" /> <Badge label="Production Ready" />

<Warning>
Always verify SSL certificate chains before bootstrapping production clusters.
</Warning>

### Prerequisites
- Linux, macOS or Windows WSL2
- 4GB RAM minimum
- Docker Desktop 4.20+

<img src="./assets/docker-setup-diagram.png" alt="Docker Network Topo" />

<Note>
For ARM64 Apple Silicon devices, native compilation flags are enabled by default.
</Note>`,
    },
    {
      path: `${repoFolder}/docs/architecture/overview.mdx`,
      content: `import { MeshDiagram } from '@acme/diagrams';
export const tier = 'enterprise';

{/* Internal architecture notes for v3 roadmap */}

# Architecture Overview

The Acme architecture consists of three discrete layers:

1. **Ingress Gateway**: TLS termination & rate limiting
2. **Execution Mesh**: Event-driven worker nodes
3. **Persistence Tier**: High-durability distributed storage

![High-Level System Topology](../assets/system-architecture.svg)

<Callout type="info">
The execution mesh dynamically provisions worker pods based on queue depth metrics.
</Callout>

<Card title="Cluster Security Spec" href="/docs/security/spec">
Read the full cryptographic attestation and zero-trust protocol whitepaper.
</Card>

[Download Enterprise Architecture Whitepaper](../downloads/enterprise-arch-whitepaper.pdf)`,
    },
    {
      path: `${repoFolder}/docs/api/v1/authentication.mdx`,
      content: `# API v1: Authentication

All REST endpoints require an \`Authorization: Bearer <TOKEN>\` header.

<Badge label="REST API" />

### Status Codes
- \`200 OK\`: Token verified
- \`401 Unauthorized\`: Expired or missing token
- \`403 Forbidden\`: Insufficient role permissions

<img src="/static/images/oauth-flow-sequence.png" alt="OAuth2 Token Exchange Flow" />

<Details summary="How to rotate API keys securely">
Navigate to **Settings > Security > Tokens**, click **Rotate Key**, and update your CI/CD pipeline environment secrets.
</Details>`,
    },
    {
      path: `${repoFolder}/docs/api/v1/users/endpoints.md`,
      content: `# Users API Endpoints

### GET /api/v1/users
Returns a paginated collection of user objects.

### POST /api/v1/users
Creates a new profile account in the current workspace.

![Users Schema Diagram](./assets/user-entity-rel.png)`,
    },
    {
      path: `${repoFolder}/docs/deployment/kubernetes.mdx`,
      content: `import { HelmChartIcon } from '@acme/icons';

# Kubernetes Deployment

<Badge label="Helm 3" />

Apply the standard Helm chart:

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: acme-cluster
spec:
  replicas: 3
\`\`\`

![Kubernetes Pod Topology](../images/k8s-pod-layout.webp)

<Warning>
Do not run root-privileged containers in multi-tenant environments.
</Warning>`,
    },
    {
      path: `${repoFolder}/docs/advanced/async-tests.md`,
      content: `## pytest.mark.anyio { #pytest-mark-anyio }

If we want to call asynchronous functions in our tests, our test functions have to be asynchronous. AnyIO provides a neat plugin for this, that allows us to specify that some test functions are to be called asynchronously.

## HTTPX { #httpx }

Even if your **FastAPI** application uses normal \`def\` functions instead of \`async def\`, it is still an async application underneath.

The \`TestClient\` does some magic inside to call the asynchronous FastAPI application in your normal \`def\` test functions, using standard pytest. But that magic doesn't work anymore when we're using it inside asynchronous functions. By running our tests asynchronously, we can no longer use the \`TestClient\` inside our test functions.

The \`TestClient\` is based on [HTTPX](https://www.python-httpx.org), and luckily, we can use it directly to test the API.

## Example { #example }

For a simple example, let's consider a file structure similar to the one described in [Bigger Applications](../tutorial/bigger-applications.md) and [Testing](../tutorial/testing.md):

\`\`\`
.
├── app
│   ├── __init__.py
│   ├── main.py
│   └── test_main.py
\`\`\`
`,
    },
    {
      path: `${repoFolder}/src/index.ts`, // Non-md file to test filtering
      content: `console.log("Acme engine booted");`,
    },
    {
      path: `${repoFolder}/package.json`, // Non-md file to test filtering
      content: `{"name": "acme", "version": "1.0.0"}`,
    },
  ];

  for (const doc of sampleDocs) {
    zip.file(doc.path, doc.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, name: 'github-acme-docs-main.zip' };
}

