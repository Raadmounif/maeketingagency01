"use client";

import { useMemo, useState, useTransition } from "react";
import { createPaymentRequestAction } from "./actions";

type Method = {
  id: string;
  name: string;
  descriptionText: string | null;
  descriptionMediaUrl: string | null;
};

type PaymentRow = {
  id: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  amountCents: number;
  methodName: string;
  clientNote: string | null;
  proofUrl: string | null;
};

function formatUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function DashboardClient(props: {
  walletBalanceCents: number;
  methods: Method[];
  payments: PaymentRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const [methodId, setMethodId] = useState(props.methods[0]?.id ?? "");
  const [amountUsd, setAmountUsd] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const sortedPayments = useMemo(() => props.payments, [props.payments]);

  return (
    <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">Dashboard</h1>
      <div className="mt-2 text-[#2C4E7A]/90">
        Wallet balance:{" "}
        <span className="font-semibold text-[#1F3A5F]">${formatUsd(props.walletBalanceCents)}</span>
      </div>

      {status ? (
        <div className="mt-4 rounded-lg border border-[#2C4E7A]/15 bg-white px-4 py-3 text-sm text-[#1F3A5F]">
          {status}
        </div>
      ) : null}

      <section className="mt-8 rounded-xl border border-[#2C4E7A]/12 bg-white p-5">
        <h2 className="text-lg font-semibold text-[#1F3A5F]">Add funds</h2>
        <p className="mt-1 text-sm text-[#2C4E7A]/85">
          Create a payment request. Status will be <strong>Pending</strong> until an admin approves.
        </p>

        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setStatus(null);
            startTransition(async () => {
              const res = await createPaymentRequestAction({
                methodId,
                amountUsd: Number(amountUsd),
                clientNote,
                proofUrl,
              });
              setStatus(res.ok ? "Payment request created." : res.message);
              if (res.ok) {
                setAmountUsd("");
                setClientNote("");
                setProofUrl("");
              }
            });
          }}
        >
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Method
            </div>
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              disabled={pending}
            >
              {props.methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Amount (USD)
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              inputMode="decimal"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              disabled={pending}
              placeholder="25"
            />
          </label>
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Note (optional)
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              disabled={pending}
              placeholder="TXID / phone number / details…"
              maxLength={512}
            />
          </label>
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              Proof URL (optional)
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              disabled={pending}
              placeholder="https://…"
              maxLength={512}
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending || !props.methods.length}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
            >
              {pending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-xl border border-[#2C4E7A]/12 bg-white p-5">
        <h2 className="text-lg font-semibold text-[#1F3A5F]">My payments</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2C4E7A]/12">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Proof</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#2C4E7A]/75">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                sortedPayments.map((p) => (
                  <tr key={p.id} className="border-b border-[#2C4E7A]/8">
                    <td className="whitespace-nowrap px-3 py-2 text-[#2C4E7A]/90">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{p.methodName}</td>
                    <td className="whitespace-nowrap px-3 py-2">${formatUsd(p.amountCents)}</td>
                    <td className="px-3 py-2 font-semibold">{p.status}</td>
                    <td className="max-w-[220px] px-3 py-2 text-[#2C4E7A]/90">
                      {p.clientNote ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {p.proofUrl ? (
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#1F3A5F] underline"
                        >
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
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

