'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ResultRendererProps {
  data: any
  className?: string
}

export default function ResultRenderer({ data, className = '' }: ResultRendererProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSections(newExpanded)
  }

  // Parse the JSON data if it's a string
  let parsedData = data
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data)
    } catch {
      parsedData = data
    }
  }

  // Detect if this looks like customer data
  if (parsedData?.customers && Array.isArray(parsedData.customers)) {
    return <CustomerTable data={parsedData} className={className} />
  }

  // Detect if this looks like product data
  if (parsedData?.products && Array.isArray(parsedData.products)) {
    return <ProductTable data={parsedData} className={className} />
  }

  // Detect if this looks like low stock data
  if (parsedData?.low_stock_items && Array.isArray(parsedData.low_stock_items)) {
    return <LowStockTable data={parsedData} className={className} />
  }

  // Detect if this looks like a single customer
  if (parsedData?.id && parsedData?.name && parsedData?.email) {
    return <CustomerDetail data={parsedData} className={className} />
  }

  // Detect if this looks like order creation success
  if (parsedData?.success && parsedData?.customer) {
    return <CustomerCreatedCard data={parsedData} className={className} />
  }

  // Detect if this looks like order creation success
  if (parsedData?.success && parsedData?.order) {
    return <OrderCreatedCard data={parsedData} className={className} />
  }

  // Fallback to JSON display for unknown structures
  return <JsonFallback data={parsedData} className={className} />
}

function CustomerTable({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          顧客一覧 ({data.total}件)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">会社名</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">電話</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ティア</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">登録日</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.customers.map((customer: any) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-mono text-gray-900">{customer.id}</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">{customer.name}</td>
                <td className="px-4 py-2 text-sm text-blue-600">{customer.email}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{customer.phone || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    customer.tier === 'enterprise' 
                      ? 'bg-purple-100 text-purple-800'
                      : customer.tier === 'professional'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {customer.tier}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {new Date(customer.created_at).toLocaleDateString('ja-JP')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductTable({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          商品一覧 ({data.total}件)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">価格</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">在庫</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.products.map((product: any) => (
              <tr key={product.sku} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-mono text-gray-900">{product.sku}</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">{product.name}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{product.category}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-900">
                  ${product.price?.toLocaleString()} / {product.unit}
                </td>
                <td className="px-4 py-2 text-center">
                  {product.in_stock ? (
                    <div className="flex flex-col">
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        在庫あり
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {product.available_quantity}個
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      在庫なし
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LowStockTable({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200">
        <h3 className="text-sm font-medium text-yellow-900">
          ⚠️ 在庫不足商品 ({data.total}件)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">現在庫</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">発注点</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">推奨発注</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">緊急度</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.low_stock_items.map((item: any) => (
              <tr key={item.sku} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.sku}</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.product_name}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-900">{item.available}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-600">{item.reorder_point}</td>
                <td className="px-4 py-2 text-sm text-right font-medium text-blue-600">{item.suggested_order}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.urgency === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : item.urgency === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.urgency === 'critical' ? '緊急' : 
                     item.urgency === 'high' ? '高' : '中'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CustomerDetail({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">顧客詳細</h3>
      </div>
      <div className="p-4">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">ID</dt>
            <dd className="text-sm font-mono text-gray-900">{data.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">会社名</dt>
            <dd className="text-sm text-gray-900">{data.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">メール</dt>
            <dd className="text-sm text-blue-600">{data.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">電話</dt>
            <dd className="text-sm text-gray-900">{data.phone || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">ティア</dt>
            <dd>
              <span className={`px-2 py-1 text-xs rounded-full ${
                data.tier === 'enterprise' 
                  ? 'bg-purple-100 text-purple-800'
                  : data.tier === 'professional'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {data.tier}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">登録日</dt>
            <dd className="text-sm text-gray-900">
              {new Date(data.created_at).toLocaleDateString('ja-JP')}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function CustomerCreatedCard({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-green-50 rounded-lg border border-green-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <h3 className="text-sm font-medium text-green-900">顧客作成完了</h3>
        </div>
        <CustomerDetail data={data.customer} />
      </div>
    </div>
  )
}

function OrderCreatedCard({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-blue-50 rounded-lg border border-blue-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-medium text-blue-900">注文作成完了</h3>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">注文ID</dt>
            <dd className="text-sm font-mono text-gray-900">{data.order.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">顧客</dt>
            <dd className="text-sm text-gray-900">{data.order.customer_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">ステータス</dt>
            <dd>
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {data.order.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">作成日</dt>
            <dd className="text-sm text-gray-900">
              {new Date(data.order.created_at).toLocaleDateString('ja-JP')}
            </dd>
          </div>
        </dl>
        
        {data.order.items && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-gray-500 mb-2">注文商品</dt>
            <div className="space-y-2">
              {data.order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm font-mono">{item.product_id}</span>
                  <span className="text-sm text-gray-600">数量: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function JsonFallback({ data, className }: { data: any; className: string }) {
  return (
    <div className={`bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}