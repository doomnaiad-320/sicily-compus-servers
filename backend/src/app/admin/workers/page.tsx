"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type Worker = {
  id: string;
  status: string;
  statusReason: string | null;
  isAccepting: boolean;
  alipayAccount: string | null;
  user: { nickname: string; phone: string | null; openid: string };
  stats?: {
    acceptedCount: number;
    completedCount: number;
    positiveCount: number;
    negativeCount: number;
    totalIncome: string;
  } | null;
  skills?: string | null;
};

const STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "审核中", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已拒绝", value: "rejected" },
];

const statusText = {
  pending: "审核中",
  approved: "已通过",
  rejected: "未通过",
  none: "未申请",
} as Record<string, string>;

const statusColor = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  none: "bg-slate-100 text-slate-600",
} as Record<string, string>;

export default function AdminWorkersPage() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState<{ skills: string; alipayAccount: string; statusReason: string; isAccepting: boolean }>({
    skills: "",
    alipayAccount: "",
    statusReason: "",
    isAccepting: false,
  });

  useEffect(() => {
    load();
  }, [status]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = status ? `?status=${status}` : "";
      const data = await adminFetch<Worker[]>(`/api/admin/workers${query}`);
      setList(data);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const audit = async (id: string, decision: "approve" | "reject") => {
    let reason = "";
    if (decision === "reject") {
      reason = prompt("请输入拒绝原因") || "";
      if (!reason) return;
    }
    try {
      await adminFetch(`/api/admin/workers/${id}/audit`, {
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
      (w.user?.nickname || "").toLowerCase().includes(keyword) ||
      (w.user?.openid || "").toLowerCase().includes(keyword)
    );
  });

  const openEdit = (w: Worker) => {
    setEditing(w);
    setForm({
      skills: w.skills || "",
      alipayAccount: w.alipayAccount || "",
      statusReason: w.statusReason || "",
      isAccepting: w.isAccepting,
    });
  };

  const closeEdit = () => setEditing(null);

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await adminFetch(`/api/admin/workers/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editing.id }),
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "更新失败");
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">管理员控制台</p>
          <h1 className="text-2xl font-semibold text-slate-900">兼职者审核</h1>
        </div>
        <div className="flex items-center gap-3">
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
            placeholder="搜索昵称/ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">加载中...</p> : null}

      <div className="admin-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">昵称</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">接单/完成</th>
              <th className="px-4 py-3">技能</th>
              <th className="px-4 py-3">收入</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{w.user?.nickname || w.user?.openid}</div>
                  <div className="text-xs text-slate-500">{w.user?.phone || "-"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor[w.status] || statusColor.none}`}>
                    {statusText[w.status] || w.status}
                  </span>
                  {w.statusReason ? <div className="text-xs text-red-500 mt-1">{w.statusReason}</div> : null}
                </td>
                <td className="px-4 py-3">
                  {w.stats
                    ? `${w.stats.acceptedCount || 0} / ${w.stats.completedCount || 0}`
                    : "0 / 0"}
                </td>
                <td className="px-4 py-3">
                  {w.skills || "-"}
                </td>
                <td className="px-4 py-3">
                  {w.stats ? `¥${w.stats.totalIncome}` : "¥0"}
                  <div className="text-xs text-slate-500">好评 {w.stats?.positiveCount || 0}</div>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    className="rounded-md border border-green-600 px-3 py-1 text-green-700 text-xs"
                    onClick={() => audit(w.id, "approve")}
                  >
                    通过
                  </button>
                  <button
                    className="rounded-md border border-red-600 px-3 py-1 text-red-700 text-xs"
                    onClick={() => audit(w.id, "reject")}
                  >
                    拒绝
                  </button>
                  <button
                    className="rounded-md border border-blue-600 px-3 py-1 text-blue-700 text-xs"
                    onClick={() => openEdit(w)}
                  >
                    编辑
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

      {editing ? (
        <div className="admin-modal">
          <div className="admin-modal-card">
            <h3 className="text-lg font-semibold mb-3">编辑兼职者</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">技能</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">支付宝账号</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.alipayAccount}
                  onChange={(e) => setForm({ ...form, alipayAccount: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isAccepting}
                  onChange={(e) => setForm({ ...form, isAccepting: e.target.checked })}
                />
                <span className="text-sm text-slate-700">可接单</span>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">备注/原因</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.statusReason}
                  onChange={(e) => setForm({ ...form, statusReason: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-slate-200 px-4 py-2" onClick={closeEdit}>
                取消
              </button>
              <button className="admin-btn px-4 py-2" onClick={submitEdit}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
