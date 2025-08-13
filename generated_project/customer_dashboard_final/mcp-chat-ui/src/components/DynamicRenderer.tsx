'use client'

import { ReactNode } from 'react'
import { User, Package, Calendar, Phone, Mail, DollarSign, AlertTriangle } from 'lucide-react'

interface DynamicRendererProps {
  data: any
  toolName: string
  serverName: string
}

interface TableColumn {
  key: string
  header: string
  type?: 'string' | 'number' | 'date' | 'email' | 'phone' | 'currency' | 'status'
  icon?: ReactNode
}

export default function DynamicRenderer({ data, toolName, serverName }: DynamicRendererProps) {
  // データ構造の解析と表示形式の決定
  const renderStrategy = determineRenderStrategy(data, toolName, serverName)
  
  switch (renderStrategy.type) {
    case 'table':
      return <TableRenderer data={renderStrategy.data} columns={renderStrategy.columns} title={renderStrategy.title} />
    case 'detail':
      return <DetailRenderer data={renderStrategy.data} fields={renderStrategy.fields} title={renderStrategy.title} />
    case 'list':
      return <ListRenderer data={renderStrategy.data} itemRenderer={renderStrategy.itemRenderer} title={renderStrategy.title} />
    case 'metrics':
      return <MetricsRenderer data={renderStrategy.data} metrics={renderStrategy.metrics} title={renderStrategy.title} />
    default:
      return <JSONRenderer data={data} />
  }
}

// レンダリング戦略の決定
function determineRenderStrategy(data: any, toolName: string, serverName: string) {
  // サーバー別・ツール別の専用レンダリング設定
  const renderRules = {
    crm: {
      'list-customers': {
        type: 'table' as const,
        dataPath: 'customers',
        title: '顧客一覧',
        columns: [
          { key: 'id', header: 'ID', type: 'string', icon: <User className="w-4 h-4" /> },
          { key: 'name', header: '会社名', type: 'string' },
          { key: 'email', header: 'メール', type: 'email', icon: <Mail className="w-4 h-4" /> },
          { key: 'phone', header: '電話番号', type: 'phone', icon: <Phone className="w-4 h-4" /> },
          { key: 'tier', header: 'プラン', type: 'status' },
          { key: 'created_at', header: '登録日', type: 'date', icon: <Calendar className="w-4 h-4" /> }
        ] as TableColumn[]
      },
      'get-customer': {
        type: 'detail' as const,
        title: '顧客詳細',
        fields: [
          { key: 'id', label: '顧客ID', type: 'string', icon: <User className="w-4 h-4" /> },
          { key: 'name', label: '会社名', type: 'string' },
          { key: 'email', label: 'メールアドレス', type: 'email', icon: <Mail className="w-4 h-4" /> },
          { key: 'phone', label: '電話番号', type: 'phone', icon: <Phone className="w-4 h-4" /> },
          { key: 'tier', label: 'サービスプラン', type: 'status' },
          { key: 'created_at', label: '登録日時', type: 'date', icon: <Calendar className="w-4 h-4" /> }
        ]
      }
    },
    inventory: {
      'list-products': {
        type: 'table' as const,
        dataPath: 'products',
        title: '商品一覧',
        columns: [
          { key: 'sku', header: 'SKU', type: 'string', icon: <Package className="w-4 h-4" /> },
          { key: 'name', header: '商品名', type: 'string' },
          { key: 'category', header: 'カテゴリ', type: 'status' },
          { key: 'price', header: '価格', type: 'currency', icon: <DollarSign className="w-4 h-4" /> },
          { key: 'available_quantity', header: '在庫数', type: 'number' },
          { key: 'in_stock', header: '在庫状況', type: 'status' }
        ] as TableColumn[]
      },
      'list-low-stock': {
        type: 'table' as const,
        dataPath: 'low_stock_items',
        title: '在庫不足商品',
        columns: [
          { key: 'sku', header: 'SKU', type: 'string', icon: <Package className="w-4 h-4" /> },
          { key: 'product_name', header: '商品名', type: 'string' },
          { key: 'available', header: '現在庫', type: 'number' },
          { key: 'reorder_point', header: '発注点', type: 'number' },
          { key: 'suggested_order', header: '推奨発注数', type: 'number' },
          { key: 'urgency', header: '緊急度', type: 'status', icon: <AlertTriangle className="w-4 h-4" /> }
        ] as TableColumn[]
      },
      'check-stock': {
        type: 'detail' as const,
        title: '在庫詳細',
        fields: [
          { key: 'sku', label: 'SKU', type: 'string', icon: <Package className="w-4 h-4" /> },
          { key: 'product_name', label: '商品名', type: 'string' },
          { key: 'quantity', label: '総在庫数', type: 'number' },
          { key: 'available', label: '利用可能数', type: 'number' },
          { key: 'reserved', label: '予約済み', type: 'number' },
          { key: 'reorder_point', label: '発注点', type: 'number' },
          { key: 'status', label: '在庫状況', type: 'status' }
        ]
      }
    }
  }

  const rule = renderRules[serverName as keyof typeof renderRules]?.[toolName as string]
  
  if (rule) {
    const actualData = rule.dataPath ? data[rule.dataPath] : data
    return {
      ...rule,
      data: actualData
    }
  }

  // デフォルト: 自動判定
  if (Array.isArray(data)) {
    return {
      type: 'table' as const,
      data,
      title: `${toolName} Results`,
      columns: inferColumns(data[0] || {})
    }
  } else if (typeof data === 'object' && data !== null) {
    return {
      type: 'detail' as const,
      data,
      title: `${toolName} Result`,
      fields: Object.keys(data).map(key => ({ key, label: key, type: 'string' }))
    }
  }

  return { type: 'json' as const, data }
}

// テーブルレンダラー
function TableRenderer({ data, columns, title }: { data: any[], columns: TableColumn[], title: string }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">データがありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          {title}
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            {data.length}件
          </span>
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th key={column.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    {column.icon}
                    {column.header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map(column => (
                  <td key={column.key} className="px-4 py-3 text-sm">
                    {formatValue(item[column.key], column.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 詳細レンダラー
function DetailRenderer({ data, fields, title }: { data: any, fields: any[], title: string }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {fields.map(field => (
          <div key={field.key} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {field.icon || <div className="w-2 h-2 bg-gray-300 rounded-full" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{field.label}</div>
              <div className="text-sm text-gray-700">
                {formatValue(data[field.key], field.type)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// リストレンダラー
function ListRenderer({ data, itemRenderer, title }: { data: any[], itemRenderer: any, title: string }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {data.map((item, index) => (
          <div key={index} className="p-4">
            {itemRenderer(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

// メトリクスレンダラー
function MetricsRenderer({ data, metrics, title }: { data: any, metrics: any[], title: string }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        {metrics.map(metric => (
          <div key={metric.key} className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(data[metric.key], metric.type)}
            </div>
            <div className="text-sm text-gray-600">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// JSONレンダラー（フォールバック）
function JSONRenderer({ data }: { data: any }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-3">
      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

// 値のフォーマット
function formatValue(value: any, type?: string): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>
  }

  switch (type) {
    case 'date':
      return new Date(value).toLocaleString('ja-JP')
    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )
    case 'phone':
      return (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )
    case 'currency':
      return `¥${value.toLocaleString()}`
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : value
    case 'status':
      return <StatusBadge value={value} />
    default:
      return String(value)
  }
}

// ステータスバッジ
function StatusBadge({ value }: { value: any }) {
  const statusColors = {
    enterprise: 'bg-purple-100 text-purple-800',
    professional: 'bg-blue-100 text-blue-800',
    startup: 'bg-green-100 text-green-800',
    software: 'bg-blue-100 text-blue-800',
    service: 'bg-green-100 text-green-800',
    hardware: 'bg-gray-100 text-gray-800',
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    healthy: 'bg-green-100 text-green-800',
    low: 'bg-orange-100 text-orange-800',
    out_of_stock: 'bg-red-100 text-red-800'
  }

  const colorClass = statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {value}
    </span>
  )
}

// カラム自動推定
function inferColumns(sample: any): TableColumn[] {
  return Object.keys(sample).map(key => ({
    key,
    header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: inferType(sample[key])
  }))
}

// 型自動推定
function inferType(value: any): TableColumn['type'] {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    if (value.includes('@')) return 'email'
    if (value.match(/^\+?[\d\s()-]+$/)) return 'phone'
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date'
  }
  return 'string'
}