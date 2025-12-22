"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type User = {
  id: string;
  nickname: string;
  openid: string;
  phone: string | null;
  currentRole: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<{ nickname: string; phone: string; currentRole: string }>({
    nickname: "",
    phone: "",
    currentRole: "user",
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<User[]>("/api/admin/users");
      setList(data);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      nickname: u.nickname || "",
      phone: u.phone || "",
      currentRole: u.currentRole || "user",
    });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await adminFetch(`/api/admin/users/${editing.id}`, {
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

  const disable = async (id: string) => {
    if (!confirm("确认禁用该用户？")) return;
    try {
      await adminFetch(`/api/admin/users/${id}/disable`, { method: "PUT" });
      alert("已记录禁用操作（占位，未真正删除）");
    } catch (e: any) {
      alert(e?.message || "操作失败");
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div>
        <p className="text-sm text-slate-500">管理员控制台</p>
        <h1 className="text-2xl font-semibold text-slate-900">用户列表</h1>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">加载中...</p> : null}

      <div className="admin-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">昵称</th>
              <th className="px-4 py-3">手机号</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{u.nickname || u.openid}</div>
                  <div className="text-xs text-slate-500">{u.id}</div>
                </td>
                <td className="px-4 py-3">{u.phone || "-"}</td>
                <td className="px-4 py-3 capitalize">{u.currentRole}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{u.createdAt}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    className="rounded-md border border-blue-600 px-3 py-1 text-blue-700 text-xs"
                    onClick={() => openEdit(u)}
                  >
                    编辑
                  </button>
                  <button
                    className="rounded-md border border-red-600 px-3 py-1 text-red-700 text-xs"
                    onClick={() => disable(u.id)}
                  >
                    禁用
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !loading ? (
          <p className="p-4 text-sm text-slate-500">暂无用户</p>
        ) : null}
      </div>

      {editing ? (
        <div className="admin-modal">
          <div className="admin-modal-card">
            <h3 className="text-lg font-semibold mb-3">编辑用户</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">昵称</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">手机号</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">角色</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.currentRole}
                  onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
                >
                  <option value="user">用户</option>
                  <option value="worker">兼职者</option>
                </select>
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
