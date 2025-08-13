# MCP Tool Builder

**Universal MCP Tool Builder** - Generate production-ready MCP tools from natural language with built-in UI, security, and scalability.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

## 🚀 What is MCP Tool Builder?

MCP Tool Builder transforms natural language descriptions into fully functional, production-ready MCP (Model Context Protocol) tools. It follows a **capability-driven, template-pack architecture** that adapts to any business domain while maintaining security, type safety, and scalability.

### Key Features

- 🎯 **Spec-First Design**: Single source of truth with automatic UI/API/DB consistency
- 🔧 **Capability Registry**: Plug-and-play infrastructure (PostgreSQL, Redis, OAuth, etc.)
- 🎨 **UI Auto-Generation**: Beautiful, secure web interfaces with zero manual coding
- 🛡️ **Built-in Security**: RBAC, PII masking, rate limiting, audit logging
- 📊 **Template Packs**: CRUD, Workflow, Analytics, E-commerce presets
- 🌐 **Multi-Provider**: Database, queue, auth, payment provider abstraction
- 🔒 **Production-Ready**: Docker, monitoring, migrations, testing included

## ⚡ Quick Start

### Installation

```bash
git clone https://github.com/your-org/mcp-tool-builder
cd mcp-tool-builder
npm install
npm run build
```

### Generate Your First Tool

```bash
# Basic MCP tool
npm run generate:ui "Customer management system"

# Full-featured with UI
npm run generate:ui "Task tracker with dashboard" \
  --with-ui \
  --enable-analytics \
  --preset crm

# Initialize configuration
npm run config:init --preset ecommerce
```

### Running Generated Tools

**⚠️ Important**: Use the `customer_dashboard_final` directory for production-ready features:

```bash
# Navigate to the final version with all security improvements
cd generated_project/customer_dashboard_final
npm install
npm run build
npm start

# For Claude Desktop integration, use the final path:
# ~/.config/claude-desktop/claude_desktop_config.json
{
  "mcpServers": {
    "customer-dashboard": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/mcp-tool-builder/generated_project/customer_dashboard_final"
    }
  }
}
```

### Example: E-commerce Tool

**Input**: `"E-commerce order management with inventory tracking"`

**Generated in 30 seconds**:
- ✅ Order & Product entities with relationships
- ✅ REST-like MCP tools (create, list, update orders)
- ✅ Inventory tracking with stock alerts
- ✅ Web UI forms and dashboards
- ✅ PostgreSQL schema with migrations
- ✅ Docker deployment ready
- ✅ TypeScript types throughout

```bash
# Deploy immediately
cd generated/ecommerce_order_management
docker-compose up -d
docker-compose exec app npm run db:migrate
# ✨ Your tool is live!
```

## 🏗️ Architecture

### Three-Layer Generation

```
Natural Language
        ↓
   Builder Spec (Intermediate)
        ↓
   Generated Artifacts
```

### Runtime Architecture

```
UI Components (Type-safe HTML/JS)
       ↓ (Safe postMessage)
UI-Tool Broker (Origin-verified)
       ↓ (Idempotent calls)
MCP Tools (Schema-validated)
       ↓
Business Logic (Pure functions)
       ↓
DAO Layer (Provider-abstracted)
       ↓
Database/External Services
```

## 📖 Usage Examples

### 1. Basic CRUD System

```bash
npm run generate:ui "Customer database with search"
```

**Generates**:
- Customer entity with fields
- Create/Read/Update/Delete tools
- Search functionality
- List view with filters
- Form validation

### 2. Workflow System

```bash
npm run generate:ui "Support ticket system with approval workflow" \
  --preset support \
  --with-ui \
  --enable-workflow
```

**Generates**:
- Ticket lifecycle management  
- Approval workflow engine
- Role-based access control
- Email notifications
- Dashboard with metrics

### 3. E-commerce Platform

```bash
npm run generate:ui "Multi-vendor marketplace" \
  --preset ecommerce \
  --with-ui \
  --enable-payment \
  --enable-analytics
```

**Generates**:
- Product catalog
- Order processing
- Payment integration (Stripe)
- Vendor management
- Sales analytics dashboard

## 🎛️ Configuration

### builder.config.yaml

```yaml
preset: crm
providers:
  storage: postgres
  queue: redis
  auth: oidc
  search: elasticsearch
ui:
  renderer: rawHtml
  origin: https://your-domain.com
  theme: bootstrap
generation:
  templatePack: crud
  features:
    analytics: true
    export: true
    i18n: true
policies:
  piiMask:
    enabled: true
    fields: [Customer.email, Customer.phone]
  rbac:
    enabled: true
    roles:
      - name: Admin
        permissions: ["*"]
      - name: Sales
        permissions: ["Customer.*", "Order.read"]
```

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
UI_ORIGIN=https://your-app.com
LOG_LEVEL=info
DEBUG=false
```

## 🧩 Template Packs

### Available Packs

- **CRUD Pack**: Basic create, read, update, delete operations
- **Workflow Pack**: Approval flows, state machines, notifications
- **Analytics Pack**: Dashboards, reports, KPI tracking
- **E-commerce Pack**: Orders, inventory, payments, shipping
- **CRM Pack**: Lead management, sales pipeline, customer tracking
- **Support Pack**: Ticketing, knowledge base, SLA tracking

### Creating Custom Packs

```typescript
class CustomTemplatePack extends BaseTemplatePack {
  name = 'custom-pack';
  version = '1.0.0';
  
  supports(features: FeatureSet): boolean {
    return features.crud && features.customFeature;
  }
  
  async renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile> {
    return {
      path: `tools/${action.name}.ts`,
      content: this.renderTemplate(this.toolTemplate, { action, ...context }),
      type: 'code'
    };
  }
}
```

## 🛡️ Security Features

### Built-in Security

- **Input Validation**: Zod schema validation at all boundaries
- **SQL Injection Prevention**: Parameterized queries only  
- **XSS Protection**: HTML escaping and CSP headers
- **Authentication**: Multi-provider support (OAuth, JWT, API keys)
- **Authorization**: RBAC/ABAC with fine-grained permissions
- **PII Masking**: Automatic sensitive data protection
- **Rate Limiting**: Configurable request throttling
- **Audit Logging**: All operations logged with context

### UI Security

- **Origin Verification**: postMessage communication secured
- **Content Security Policy**: No inline scripts allowed
- **Idempotency**: Duplicate request prevention
- **Request Signing**: Cryptographic request integrity
- **Session Management**: Secure token handling

### UI Embedding Security Guidelines

When embedding generated UI components in external applications:

```html
<!-- Secure iframe embedding with strict sandbox -->
<iframe 
  src="https://your-fixed-origin.com/dashboard" 
  sandbox="allow-scripts allow-same-origin allow-forms"
  style="width:100%; height:600px; border:none;">
</iframe>
```

**Security Requirements:**
- **Fixed Origin**: Always use HTTPS with fixed, known origin (`UI_ORIGIN` env var)
- **Sandbox Restrictions**: Use minimal required permissions in sandbox attribute
- **CSP Headers**: Implement Content-Security-Policy to prevent XSS
- **PostMessage Validation**: Verify message origin before processing UI commands
- **No Inline Scripts**: All JavaScript must be in external files with nonce/hash

```javascript
// UI-Tool communication security
window.addEventListener('message', (event) => {
  // Critical: Verify origin matches expected UI_ORIGIN
  if (event.origin !== process.env.UI_ORIGIN) {
    console.warn('Rejected message from untrusted origin:', event.origin);
    return;
  }
  
  // Process validated UI commands
  handleSecureUIMessage(event.data);
});
```

## 🔧 Providers

### Storage Providers
- **PostgreSQL**: Full SQL support with migrations
- **MongoDB**: Document storage with aggregations  
- **Google Sheets**: Spreadsheet as database
- **REST API**: External service integration
- **Vector DB**: Embedding storage for AI features

### Queue Providers
- **Redis**: Fast in-memory queuing
- **AWS SQS**: Managed cloud queuing
- **Google Pub/Sub**: Event-driven messaging
- **Memory**: Development/testing queue

### Auth Providers
- **OAuth 2.0/OIDC**: Standards-based authentication
- **JWT**: Stateless token authentication
- **API Keys**: Simple service authentication
- **Session**: Traditional session management

### Other Providers
- **Payment**: Stripe, PayPal, Square
- **Email**: SendGrid, AWS SES, SMTP
- **Search**: Elasticsearch, Algolia, basic text
- **LLM**: OpenAI, Anthropic, local models

## 📊 Monitoring & Observability

### Built-in Metrics

Generated tools automatically include:

- **Performance**: `tool_latency_ms`, `db_query_time_ms`
- **Business**: `orders_created_total`, `revenue_usd`
- **System**: `memory_usage_mb`, `active_connections`
- **Security**: `auth_failures_total`, `rate_limit_hits`

### Monitoring Stack

```yaml
# Auto-generated monitoring
monitoring:
  enabled: true
  metrics:
    port: 9090
    path: /metrics
  logging:
    level: info
    format: json
  tracing:
    enabled: true
    serviceName: my-mcp-tool
```

## 🧪 Testing

### Generated Tests

Every tool includes:

- **Unit Tests**: Business logic validation
- **Integration Tests**: Database and API testing
- **Contract Tests**: Schema compatibility  
- **E2E Tests**: Full user workflow testing
- **Load Tests**: Performance benchmarking

### Running Tests

```bash
cd generated/my-tool
npm test                 # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:load       # Load testing
```

## 🚀 Deployment

### Local Development

```bash
cd generated/my-tool
cp .env.example .env
npm install
npm run dev
```

### Docker Deployment

```bash
docker-compose up -d
docker-compose exec app npm run db:migrate
```

### Kubernetes (Generated)

```bash
kubectl apply -f k8s/
```

### Serverless (Generated)

```bash
npm run deploy:serverless
```

## 🤝 Contributing

### Development Setup

```bash
git clone https://github.com/your-org/mcp-tool-builder
cd mcp-tool-builder
npm install
npm run dev  # Watch mode
```

### Adding Providers

1. Implement the provider interface
2. Register with the appropriate registry
3. Add to configuration schema
4. Write tests
5. Update documentation

### Adding Template Packs

1. Extend `BaseTemplatePack`
2. Implement required render methods
3. Register with `templatePackRegistry`
4. Add preset configuration
5. Create example usage

## 📚 Documentation

- [**Architecture Guide**](./ARCHITECTURE.md): Deep dive into system design
- [**API Reference**](./docs/api/): Generated API documentation
- [**Template Pack Guide**](./docs/template-packs/): Creating custom packs
- [**Provider Guide**](./docs/providers/): Implementing new providers
- [**Security Guide**](./docs/security/): Security best practices
- [**Deployment Guide**](./docs/deployment/): Production deployment

## 💡 Examples

Check out the [examples/](./examples/) directory for:

- **Basic CRUD**: Simple customer management
- **E-commerce**: Full online store
- **CRM**: Sales pipeline management
- **Support**: Ticketing system
- **Analytics**: Business intelligence dashboard

## ❓ FAQ

**Q: How is this different from low-code platforms?**
A: MCP Tool Builder generates real, readable, modifiable code. No vendor lock-in, full customization possible.

**Q: Can I modify the generated code?**
A: Absolutely! Generated code is clean, documented TypeScript that you own completely.

**Q: How secure are the generated tools?**
A: Security is built-in by design with input validation, SQL injection prevention, RBAC, PII masking, and audit logging.

**Q: What's the performance like?**
A: Generated tools are optimized for production with connection pooling, caching, and efficient database queries.

**Q: Can I use my own database?**
A: Yes! The provider system supports PostgreSQL, MongoDB, MySQL, and custom implementations.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file.

## 🙏 Acknowledgments

- Model Context Protocol team at Anthropic
- TypeScript team for excellent tooling
- Zod for runtime validation
- All the amazing open-source contributors

---

**Ready to build your next tool?**

```bash
npm run generate:ui "Your amazing idea here" --with-ui
```

🚀 **From idea to production in minutes, not months!**