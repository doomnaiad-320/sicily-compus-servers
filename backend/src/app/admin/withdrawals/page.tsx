"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type Withdrawal = {
  id: string;
  amount: string;
  status: string;
  alipayAccount: string;
  createdAt: string;
  worker: {
    id: string;
    user: { nickname: string; openid: string };
  };
};

const STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已拒绝", value: "rejected" },
  { label: "已打款", value: "paid" },
];

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState<Withdrawal[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [status, page]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = status ? `?status=${status}` : "";
      const data = await adminFetch<Withdrawal[]>(`/api/admin/withdrawals${query}`);
      setList(data);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handle = async (id: string, decision: "approve" | "reject") => {
    let reason = "";
    if (decision === "reject") {
      reason = prompt("请输入拒绝原因") || "";
      if (!reason) return;
    }
    try {
      await adminFetch(`/api/admin/withdrawals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "操作失败");
    }
  };

  const filtered = (list || []).filter((w) => {
    if (!search) return true;
    const keyword = search.toLowerCase();
    return (
      w.id.toLowerCase().includes(keyword) ||
      (w.alipayAccount || "").toLowerCase().includes(keyword) ||
      (w.worker?.user?.nickname || "").toLowerCase().includes(keyword)
    );
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">管理员控制台</p>
          <h1 className="text-2xl font-semibold text-slate-900">提现审核</h1>
        </div>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="搜索账号/昵称/ID"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">加载中...</p> : null}

      <div className="admin-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">提现金额</th>
              <th className="px-4 py-3">账号</th>
              <th className="px-4 py-3">兼职者</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">¥{w.amount}</td>
                <td className="px-4 py-3">{w.alipayAccount}</td>
                <td className="px-4 py-3">{w.worker?.user?.nickname || w.worker?.user?.openid}</td>
                <td className="px-4 py-3 capitalize">{w.status}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{w.createdAt}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    className="rounded-md border border-green-600 px-3 py-1 text-green-700 text-xs"
                    onClick={() => handle(w.id, "approve")}
                  >
                    通过
                  </button>
                  <button
                    className="rounded-md border border-red-600 px-3 py-1 text-red-700 text-xs"
                    onClick={() => handle(w.id, "reject")}
                  >
                    拒绝
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading ? (
          <p className="p-4 text-sm text-slate-500">暂无数据</p>
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
