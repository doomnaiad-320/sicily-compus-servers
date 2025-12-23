"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type Order = {
  id: string;
  type: string;
  title?: string;
  description: string;
  status: string;
  amount: string;
  user: { nickname: string; openid: string };
  worker?: { id: string; userId?: string };
  createdAt: string;
  expectedTime?: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
};

type OrderDetail = Order & {
  address: string;
  review?: { rating: number; content: string | null };
  afterSale?: { status: string; reason: string; result: string | null };
  appeals?: { id: string; status: string; reason: string; result: string | null }[];
  updatedAt?: string;
  images?: string[];
  deliveryNote?: string;
  deliveryImages?: string[];
  deliveredAt?: string | null;
};

const STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "待支付", value: "unpaid" },
  { label: "待咨询", value: "consulting" },
  { label: "待接单", value: "pending" },
  { label: "服务中", value: "in_progress" },
  { label: "待确认", value: "waiting_confirm" },
  { label: "已完成", value: "completed" },
  { label: "售后中", value: "aftersale" },
  { label: "申诉中", value: "appealing" },
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    load();
  }, [status, page]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = status ? `?status=${status}` : "";
      const data = await adminFetch<Order[]>(`/api/admin/orders${query}`);
      setList(data);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetail({
      id,
      type: "",
      title: "",
      description: "",
      status: "",
      amount: "",
      address: "",
      expectedTime: "",
      contactName: "",
      contactPhone: "",
      user: { nickname: "", openid: "" },
      createdAt: "",
      images: [],
    });
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await adminFetch<OrderDetail>(`/api/admin/orders/${id}`);
      setDetail(data);
    } catch (e: any) {
      setDetailError(e?.message || "加载失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError("");
  };

  const filtered = (list || []).filter((o) => {
    if (!search) return true;
    const keyword = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(keyword) ||
      (o.description || "").toLowerCase().includes(keyword) ||
      (o.type || "").toLowerCase().includes(keyword)
    );
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">管理员控制台</p>
          <h1 className="text-2xl font-semibold text-slate-900">订单列表</h1>
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
          placeholder="搜索订单ID/描述"
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
              <th className="px-4 py-3">订单</th>
              <th className="px-4 py-3">金额</th>
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">接单人</th>
              <th className="px-4 py-3">期望时间</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{o.title || o.type}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{o.description}</div>
                  <div className="text-[11px] text-slate-400 mt-1">地址：{o.address || "-"}</div>
                </td>
                <td className="px-4 py-3">¥{o.amount}</td>
                <td className="px-4 py-3">{o.user?.nickname || o.user?.openid}</td>
                <td className="px-4 py-3">
                  {o.worker ? (
                    <div className="space-y-0.5">
                      <div className="text-slate-900">{o.worker.id}</div>
                      <div className="text-xs text-slate-500">{o.worker.nickname || "-"}</div>
                      <div className="text-[11px] text-slate-400">{o.worker.phone || "-"}</div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{o.expectedTime || "-"}</td>
                <td className="px-4 py-3">{STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{o.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="text-sm text-slate-600 hover:text-slate-900"
                    onClick={() => openDetail(o.id)}
                  >
                    查看
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

      {detail ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-400">订单详情</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-slate-900">{detail.title || detail.type}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{detail.id}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600 font-medium">
                    ¥{detail.amount}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600 capitalize">{detail.status}</span>
                </div>
              </div>
              <button
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
                onClick={closeDetail}
              >
                关闭
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4 text-sm text-slate-700">
              {detailError ? <p className="text-red-600">{detailError}</p> : null}
              {detailLoading ? <p className="text-slate-500">加载中...</p> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard label="类型" value={detail.type} />
                <DetailCard label="状态" value={detail.status} />
                <DetailCard label="金额" value={`¥${detail.amount}`} />
                <DetailCard label="期望时间" value={detail.expectedTime} />
                <DetailCard label="创建时间" value={detail.createdAt} />
                <DetailCard label="更新时间" value={detail.updatedAt || "-"} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBlock title="地址" content={detail.address} />
                <InfoBlock title="描述" content={detail.description} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <InfoBlock
                  title="联系人"
                  content={
                    <>
                      <p className="font-medium text-slate-900">{detail.contactName || "-"}</p>
                      <p className="text-xs text-slate-500">{detail.contactPhone || "-"}</p>
                    </>
                  }
                />
                <InfoBlock
                  title="下单用户"
                  content={
                    <>
                      <p className="font-medium text-slate-900">{detail.user?.nickname || detail.user?.openid}</p>
                      <p className="text-xs text-slate-500">{detail.user?.id}</p>
                      <p className="text-xs text-slate-500">{detail.user?.phone || "-"}</p>
                    </>
                  }
                />
                <InfoBlock
                  title="接单人"
                  content={
                    detail.worker ? (
                      <>
                        <p className="font-medium text-slate-900">{detail.worker.nickname || detail.worker.id}</p>
                        <p className="text-xs text-slate-500">{detail.worker.id}</p>
                        <p className="text-xs text-slate-500">{detail.worker.phone || "-"}</p>
                      </>
                    ) : (
                      "-"
                    )
                  }
                />
              </div>

              {detail.images && detail.images.length > 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                  <p className="font-medium text-slate-900">附件图片</p>
                  <div className="flex flex-wrap gap-3">
                    {detail.images.map((img) => (
                      <img
                        key={img}
                        src={img}
                        alt="附件图片"
                        className="h-24 w-24 rounded border border-slate-200 object-cover bg-white"
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {(detail.deliveryNote || (detail.deliveryImages && detail.deliveryImages.length > 0)) && (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 space-y-2">
                  <p className="font-medium text-amber-900">交付内容</p>
                  {detail.deliveryNote ? (
                    <p className="text-slate-800 whitespace-pre-line">备注：{detail.deliveryNote}</p>
                  ) : null}
                  {detail.deliveryImages && detail.deliveryImages.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {detail.deliveryImages.map((img) => (
                        <img
                          key={img}
                          src={img}
                          alt="交付图片"
                          className="h-24 w-24 rounded border border-amber-200 object-cover bg-white"
                        />
                      ))}
                    </div>
                  ) : null}
                  {detail.deliveredAt ? (
                    <p className="text-xs text-amber-700">交付时间：{detail.deliveredAt}</p>
                  ) : null}
                </div>
              )}

              {detail.review ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">评价</p>
                  <p className="text-slate-700 mt-1">评分：{detail.review.rating}</p>
                  <p className="text-slate-700">内容：{detail.review.content || "-"}</p>
                </div>
              ) : null}

              {detail.afterSale ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">售后</p>
                  <p className="text-slate-700 mt-1">状态：{detail.afterSale.status}</p>
                  <p className="text-slate-700">原因：{detail.afterSale.reason}</p>
                  <p className="text-slate-700">结果：{detail.afterSale.result || "-"}</p>
                </div>
              ) : null}

              {detail.appeals && detail.appeals.length > 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                  <p className="font-medium text-slate-900">申诉</p>
                  {detail.appeals.map((a) => (
                    <div key={a.id} className="rounded border border-slate-200 px-3 py-2">
                      <p>状态：{a.status}</p>
                      <p>原因：{a.reason}</p>
                      <p>结果：{a.result || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex text-sm text-slate-700">
      <div className="w-24 text-slate-500">{label}</div>
      <div className="flex-1 text-slate-900">{value ?? "-"}</div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value ?? "-"}</p>
    </div>
  );
}

function InfoBlock({ title, content }: { title: string; content: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1 text-sm text-slate-900 space-y-0.5">{content}</div>
    </div>
  );
}
