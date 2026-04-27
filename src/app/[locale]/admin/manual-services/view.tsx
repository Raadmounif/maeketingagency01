"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createCustomServiceAction,
  deleteCustomServiceAction,
  updateCustomServiceAction,
  updateCustomServiceOrderStatusAction,
} from "./actions";

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  priceUsd: string;
  enabled: boolean;
  sort: number;
  updatedAt: string;
};

type OrderRow = {
  id: string;
  status: "ORDERED" | "DONE";
  createdAt: string;
  clientNote: string | null;
  userEmail: string;
  userName: string | null;
  serviceId: string;
  serviceName: string;
  priceUsd: string;
};

export default function ManualServicesAdminClient(props: {
  services: ServiceRow[];
  orders: OrderRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const [orderFilter, setOrderFilter] = useState<"ALL" | "ORDERED" | "DONE">("ORDERED");

  const filteredOrders = useMemo(() => {
    if (orderFilter === "ALL") return props.orders;
    return props.orders.filter((o) => o.status === orderFilter);
  }, [props.orders, orderFilter]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 5000);
  }

  return (
    <div className="flex flex-col gap-10">
      {message ? (
        <div className="rounded-lg border border-[#2C4E7A]/20 bg-white px-4 py-3 text-sm text-[#1F3A5F]">
          {message}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-[#1F3A5F]">Add a service</h2>
        <p className="mt-1 text-sm text-[#2C4E7A]/85">
          Name, description, and price (USD). These are separate from the SMM API catalog.
        </p>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await createCustomServiceAction({
                name: newName,
                description: newDescription,
                priceUsd: newPrice,
              });
              if (!res.ok) {
                flash(res.message);
                return;
              }
              setNewName("");
              setNewDescription("");
              setNewPrice("");
              flash("Service created.");
            });
          }}
        >
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Name
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              maxLength={255}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Description
            </span>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Price (USD)
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-lg border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1F3A5F] px-4 text-sm font-semibold text-white transition hover:bg-[#2C4E7A] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add service"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#1F3A5F]">Services</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2C4E7A]/12 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Sort</th>
                <th className="px-3 py-2">On</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {props.services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#2C4E7A]/75">
                    No manual services yet.
                  </td>
                </tr>
              ) : (
                props.services.map((s) => (
                  <ServiceEditRow
                    key={`${s.id}:${s.updatedAt}`}
                    initial={s}
                    pending={pending}
                    startTransition={startTransition}
                    onFlash={flash}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1F3A5F]">Orders board</h2>
            <p className="mt-1 text-sm text-[#2C4E7A]/85">
              New requests start as <strong>Ordered</strong>. Mark <strong>Done</strong> when you
              finish the work.
            </p>
          </div>
          <label className="text-sm text-[#1F3A5F]">
            <span className="mr-2 font-medium">Show</span>
            <select
              className="rounded-lg border border-[#2C4E7A]/20 bg-white px-3 py-2"
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as typeof orderFilter)}
            >
              <option value="ORDERED">Ordered only</option>
              <option value="DONE">Done only</option>
              <option value="ALL">All</option>
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2C4E7A]/12 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#2C4E7A]/75">
                    No orders in this view.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[#2C4E7A]/8 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-[#2C4E7A]/90">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[#1F3A5F]">{o.serviceName}</td>
                    <td className="px-3 py-2 text-[#2C4E7A]/90">
                      <div className="font-medium text-[#1F3A5F]">{o.userEmail}</div>
                      {o.userName ? <div className="text-xs">{o.userName}</div> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">${o.priceUsd}</td>
                    <td className="max-w-[220px] px-3 py-2 text-[#2C4E7A]/90">
                      {o.clientNote ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border border-[#2C4E7A]/20 bg-white px-2 py-1.5 text-sm"
                        value={o.status}
                        disabled={pending}
                        onChange={(e) => {
                          const status = e.target.value as "ORDERED" | "DONE";
                          startTransition(async () => {
                            const res = await updateCustomServiceOrderStatusAction({
                              orderId: o.id,
                              status,
                            });
                            if (!res.ok) flash(res.message);
                          });
                        }}
                      >
                        <option value="ORDERED">Ordered</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ServiceEditRow(props: {
  initial: ServiceRow;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onFlash: (msg: string) => void;
}) {
  const [name, setName] = useState(props.initial.name);
  const [description, setDescription] = useState(props.initial.description);
  const [priceUsd, setPriceUsd] = useState(props.initial.priceUsd);
  const [sort, setSort] = useState(String(props.initial.sort));
  const [enabled, setEnabled] = useState(props.initial.enabled);

  return (
    <tr className="border-b border-[#2C4E7A]/8 align-top">
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[140px] rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <textarea
          className="w-full min-w-[200px] rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-24 rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          value={priceUsd}
          onChange={(e) => setPriceUsd(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          className="w-16 rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </td>
      <td className="space-y-1 px-3 py-2 whitespace-nowrap">
        <button
          type="button"
          disabled={props.pending}
          className="mr-1 rounded bg-[#1F3A5F] px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
          onClick={() => {
            props.startTransition(async () => {
              const res = await updateCustomServiceAction({
                id: props.initial.id,
                name,
                description,
                priceUsd,
                enabled,
                sort: Number(sort),
              });
              if (!res.ok) props.onFlash(res.message);
              else props.onFlash("Saved.");
            });
          }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={props.pending}
          className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
          onClick={() => {
            if (!window.confirm("Delete this service? Only allowed if it has no orders.")) return;
            props.startTransition(async () => {
              const res = await deleteCustomServiceAction({ id: props.initial.id });
              if (!res.ok) props.onFlash(res.message);
              else props.onFlash("Deleted.");
            });
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
