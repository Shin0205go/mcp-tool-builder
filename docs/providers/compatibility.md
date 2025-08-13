# Provider Compatibility Matrix

This document defines the compatibility matrix for all supported providers in MCP Tool Builder.

## Overview

MCP Tool Builder supports multiple providers for each capability type. This matrix shows which providers are compatible with each other and what features they support.

## Storage Providers

| Provider | Status | CRUD | Transactions | Migrations | Indexes | Full-Text Search | JSON Support | Notes |
|----------|--------|------|--------------|------------|---------|------------------|--------------|-------|
| **PostgreSQL** | ✅ Production | ✅ | ✅ | ✅ | ✅ | ✅ (tsvector) | ✅ (JSONB) | Recommended for production |
| **MySQL** | ✅ Production | ✅ | ✅ | ✅ | ✅ | ✅ (FULLTEXT) | ✅ (JSON) | Good performance |
| **MongoDB** | ✅ Production | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ (text index) | ✅ Native | NoSQL option |
| **SQLite** | ✅ Development | ✅ | ✅ | ✅ | ✅ | ⚠️ FTS5 | ⚠️ Limited | Development/testing only |
| **Google Sheets** | 🔄 Beta | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Prototyping only |
| **REST API** | 🔄 Beta | ✅ | ⚠️ Depends | ❌ | ❌ | ⚠️ Depends | ⚠️ Depends | Custom endpoints |

### Storage Provider Recommendations

- **PostgreSQL**: Best for production applications requiring full SQL features
- **MySQL**: Good alternative to PostgreSQL with slightly better performance
- **MongoDB**: Choose for document-heavy applications or when JSON flexibility is key
- **SQLite**: Perfect for development, testing, and single-user applications

## Queue Providers

| Provider | Status | Reliability | Persistence | Scheduling | Priority | Dead Letters | Clustering | Max Message Size |
|----------|--------|-------------|-------------|------------|----------|--------------|------------|------------------|
| **Redis** | ✅ Production | ✅ High | ✅ | ✅ | ✅ | ✅ | ✅ | 512MB |
| **AWS SQS** | ✅ Production | ✅ Highest | ✅ | ✅ | ❌ | ✅ | ✅ Native | 256KB |
| **Google Pub/Sub** | ✅ Production | ✅ Highest | ✅ | ✅ | ❌ | ✅ | ✅ Native | 10MB |
| **Memory** | 🔧 Development | ⚠️ Low | ❌ | ⚠️ Limited | ✅ | ❌ | ❌ | RAM limited |
| **RabbitMQ** | 🔄 Beta | ✅ High | ✅ | ✅ | ✅ | ✅ | ✅ | 128MB |

### Queue Provider Recommendations

- **Redis**: Best balance of features and performance for most applications
- **AWS SQS**: Choose for AWS-native applications requiring maximum reliability
- **Google Pub/Sub**: Best for event-driven architectures with high throughput
- **Memory**: Development and testing only

## Authentication Providers

| Provider | Status | Standards | MFA | SSO | Token Types | User Management | Session Management | RBAC Integration |
|----------|--------|-----------|-----|-----|-------------|----------------|-------------------|------------------|
| **OAuth 2.0/OIDC** | ✅ Production | ✅ RFC | ✅ | ✅ | JWT/Opaque | ✅ External | ✅ | ✅ Claims-based |
| **JWT** | ✅ Production | ✅ RFC 7519 | ❌ | ❌ | JWT | ⚠️ External | ⚠️ Stateless | ✅ Claims-based |
| **API Keys** | ✅ Production | Custom | ❌ | ❌ | Opaque | ✅ Built-in | ✅ | ✅ Role-based |
| **Basic Auth** | 🔧 Development | HTTP Basic | ❌ | ❌ | None | ✅ Built-in | ❌ | ⚠️ Limited |
| **Session** | ✅ Production | Custom | ✅ | ❌ | Session ID | ✅ Built-in | ✅ | ✅ Built-in |

### Authentication Provider Recommendations

- **OAuth 2.0/OIDC**: Best for enterprise applications requiring SSO integration
- **JWT**: Good for API-first applications and microservices
- **API Keys**: Simple and effective for service-to-service communication
- **Session**: Traditional web applications with server-side rendering

## Payment Providers

| Provider | Status | Regions | Currencies | Payment Methods | Recurring | Webhooks | Refunds | Marketplace |
|----------|--------|---------|------------|----------------|-----------|----------|---------|-------------|
| **Stripe** | ✅ Production | Global | 135+ | Cards, Wallets, Bank | ✅ | ✅ | ✅ | ✅ Connect |
| **PayPal** | ✅ Production | 200+ countries | 25+ | PayPal, Cards | ✅ | ✅ | ✅ | ❌ |
| **Square** | ✅ Production | US, CA, AU, JP, UK | Local | Cards, Cash | ✅ | ✅ | ✅ | ❌ |
| **Adyen** | 🔄 Beta | Global | 150+ | Cards, Local methods | ✅ | ✅ | ✅ | ✅ MarketPay |

## Search Providers

| Provider | Status | Full-Text | Faceting | Auto-complete | Analytics | Real-time | Languages | Scaling |
|----------|--------|-----------|----------|---------------|-----------|-----------|-----------|---------|
| **Elasticsearch** | ✅ Production | ✅ | ✅ | ✅ | ✅ Kibana | ✅ | 50+ | Horizontal |
| **Algolia** | ✅ Production | ✅ | ✅ | ✅ | ✅ Dashboard | ✅ | 60+ | Managed |
| **Typesense** | 🔄 Beta | ✅ | ✅ | ✅ | ✅ | ✅ | 30+ | Horizontal |
| **Basic Text** | 🔧 Development | ⚠️ Limited | ❌ | ❌ | ❌ | ✅ | 1 | Vertical only |

## LLM Providers

| Provider | Status | Models | Context Length | Streaming | Function Calling | Vision | Code | Pricing |
|----------|--------|--------|----------------|-----------|------------------|--------|------|---------|
| **OpenAI** | ✅ Production | GPT-4, GPT-3.5 | Up to 128k | ✅ | ✅ | ✅ GPT-4V | ✅ Codex | Per token |
| **Anthropic** | ✅ Production | Claude 3 family | Up to 200k | ✅ | ✅ | ✅ | ✅ | Per token |
| **Google** | 🔄 Beta | Gemini Pro | Up to 32k | ✅ | ✅ | ✅ | ✅ | Per token |
| **Local (Ollama)** | 🔧 Development | Llama, Mistral | Up to 32k | ✅ | ⚠️ Limited | ❌ | ✅ | Free |

## Provider Combinations

### Recommended Stacks

#### 🚀 **Production Stack**
- **Storage**: PostgreSQL
- **Queue**: Redis  
- **Auth**: OAuth 2.0/OIDC
- **Payment**: Stripe
- **Search**: Elasticsearch
- **LLM**: OpenAI/Anthropic

#### 💰 **Cost-Optimized Stack**
- **Storage**: MySQL
- **Queue**: Redis
- **Auth**: JWT
- **Payment**: PayPal
- **Search**: Typesense
- **LLM**: Local (Ollama)

#### 🔧 **Development Stack**
- **Storage**: SQLite
- **Queue**: Memory
- **Auth**: Basic Auth
- **Payment**: Stripe (test mode)
- **Search**: Basic Text
- **LLM**: OpenAI (with limits)

### Incompatible Combinations

❌ **Avoid these combinations:**

- SQLite + High-traffic applications (>1000 concurrent users)
- Memory Queue + Production environments
- Basic Auth + Public-facing applications
- Google Sheets + Production workloads

## Configuration Examples

### PostgreSQL + Redis + OAuth
```yaml
providers:
  storage: postgres
  queue: redis
  auth: oauth
  
database:
  connection:
    host: postgres.example.com
    database: myapp
    username: ${DB_USER}
    password: ${DB_PASS}
    
queue:
  redis:
    host: redis.example.com
    port: 6379
    
auth:
  oauth:
    issuer: https://auth.example.com
    clientId: ${OAUTH_CLIENT_ID}
```

### MySQL + SQS + JWT
```yaml
providers:
  storage: mysql
  queue: sqs
  auth: jwt
  
database:
  connection:
    host: mysql.example.com
    database: myapp
    
queue:
  sqs:
    region: us-east-1
    queueUrl: ${SQS_QUEUE_URL}
    
auth:
  jwt:
    secret: ${JWT_SECRET}
    expiresIn: 7d
```

## Provider Migration Paths

### Storage Migrations
- **SQLite → PostgreSQL**: Direct schema migration supported
- **MySQL → PostgreSQL**: Schema conversion required  
- **MongoDB → PostgreSQL**: Data transformation required

### Queue Migrations
- **Memory → Redis**: Configuration change only
- **Redis → SQS**: Message format compatible
- **SQS → Pub/Sub**: Re-engineering required

## Performance Characteristics

### Throughput (requests/second)

| Provider Category | Low Load | Medium Load | High Load |
|-------------------|----------|-------------|-----------|
| **PostgreSQL** | 1,000 | 10,000 | 100,000+ |
| **MySQL** | 1,200 | 12,000 | 120,000+ |
| **MongoDB** | 800 | 8,000 | 80,000+ |
| **Redis Queue** | 10,000 | 100,000 | 1,000,000+ |
| **SQS** | 300 | 3,000 | 300,000+ |

### Latency (95th percentile)

| Provider | Local | Regional | Global |
|----------|-------|----------|--------|
| **PostgreSQL** | <1ms | <10ms | <100ms |
| **Redis** | <1ms | <5ms | <50ms |
| **Elasticsearch** | <10ms | <50ms | <200ms |

## Support Matrix

### Community Support
✅ **Excellent**: PostgreSQL, MySQL, Redis, OAuth  
🔄 **Good**: MongoDB, JWT, Stripe  
⚠️ **Limited**: SQLite, Memory Queue, Basic Auth

### Enterprise Support
✅ **Available**: PostgreSQL, MySQL, MongoDB, Redis, OAuth, Stripe, Elasticsearch  
❌ **Not Available**: SQLite, Memory Queue, Basic Auth, Google Sheets

## Migration Tools

The builder provides migration utilities for:

- **Schema migrations**: All SQL providers
- **Data migrations**: PostgreSQL ↔ MySQL, MongoDB export
- **Configuration migrations**: All providers
- **Provider switching**: Runtime configuration changes

## Testing Compatibility

Each provider combination is tested with:
- ✅ Unit tests for individual providers
- ✅ Integration tests for provider combinations  
- ✅ Load tests for production stacks
- ✅ End-to-end tests for complete workflows

---

**Last Updated**: 2024-12-08  
**Version**: 2.0.0  
**Compatibility**: MCP Tool Builder 2.0.0+