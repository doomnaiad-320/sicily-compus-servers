"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type Review = {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  order: { id: string; userId: string; workerId: string | null };
};

export default function AdminReviewsPage() {
  const [list, setList] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<Review[]>("/api/admin/reviews");
      setList(data);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("确定删除该评价？")) return;
    try {
      await adminFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e?.message || "删除失败");
    }
  };

  const paged = list.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div>
        <p className="text-sm text-slate-500">管理员控制台</p>
        <h1 className="text-2xl font-semibold text-slate-900">评价管理</h1>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">加载中...</p> : null}

      <div className="admin-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">评分</th>
              <th className="px-4 py-3">内容</th>
              <th className="px-4 py-3">订单</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.rating}★</td>
                <td className="px-4 py-3 max-w-xs text-slate-900">
                  {r.content || "-"}
                  <div className="text-xs text-slate-500">用户 {r.order?.userId}</div>
                </td>
                <td className="px-4 py-3">{r.order?.id}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.createdAt}</td>
                <td className="px-4 py-3">
                  <button
                    className="rounded-md border border-red-600 px-3 py-1 text-red-700 text-xs"
                    onClick={() => remove(r.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading ? (
          <p className="p-4 text-sm text-slate-500">暂无评价</p>
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
          第 {page} 页 / 共 {Math.max(1, Math.ceil(list.length / pageSize))} 页
        </span>
        <button
          className="rounded-md border border-slate-200 px-3 py-1"
          disabled={page * pageSize >= list.length}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
