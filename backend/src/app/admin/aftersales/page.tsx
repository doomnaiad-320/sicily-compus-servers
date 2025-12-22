"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type AfterSale = {
  orderId: string;
  reason: string;
  status: string;
  result: string | null;
  createdAt: string;
  order: { userId: string; workerId: string | null };
};

export default function AdminAfterSalesPage() {
  const [list, setList] = useState<AfterSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const orders = await adminFetch<any[]>("/api/admin/orders?status=aftersale");
      const records: AfterSale[] = [];
      orders.forEach((o) => {
        if (o.afterSale) records.push(o.afterSale);
      });
      setList(records);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (orderId: string) => {
    const result = prompt("请输入处理结果") || "";
    if (!result) return;
    try {
      await adminFetch(`/api/aftersale/${orderId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "处理失败");
    }
  };

  const filtered = (list || []).filter((a) => {
    if (!search) return true;
    const keyword = search.toLowerCase();
    return (
      a.orderId.toLowerCase().includes(keyword) ||
      (a.reason || "").toLowerCase().includes(keyword) ||
      (a.order?.userId || "").toLowerCase().includes(keyword)
    );
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div>
        <p className="text-sm text-slate-500">管理员控制台</p>
        <h1 className="text-2xl font-semibold text-slate-900">售后处理</h1>
      </div>
      <div className="flex items-center gap-3">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="搜索订单ID/原因/用户ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">加载中...</p> : null}

      <div className="admin-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">订单ID</th>
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">原因</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">结果</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => (
              <tr key={a.orderId} className="border-t border-slate-100">
                <td className="px-4 py-3">{a.orderId}</td>
                <td className="px-4 py-3">{a.order?.userId}</td>
                <td className="px-4 py-3 max-w-xs">{a.reason}</td>
                <td className="px-4 py-3 capitalize">{a.status}</td>
                <td className="px-4 py-3">{a.result || "-"}</td>
                <td className="px-4 py-3">
                  {a.status === "pending" ? (
                    <button
                      className="rounded-md border border-blue-600 px-3 py-1 text-blue-700 text-xs"
                      onClick={() => resolve(a.orderId)}
                    >
                      处理
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading ? (
          <p className="p-4 text-sm text-slate-500">暂无售后</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
        <button
          className="rounded-md border border-slate-200 px-3 py-1"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          上一页
        </button>
        <span>
          第 {page} 页 / 共 {Math.max(1, Math.ceil(filtered.length / pageSize))} 页
        </span>
        <button
          className="rounded-md border border-slate-200 px-3 py-1"
          disabled={page * pageSize >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
