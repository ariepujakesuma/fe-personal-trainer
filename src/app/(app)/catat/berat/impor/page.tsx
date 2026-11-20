"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button, PageHeader, Select } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { TARGETS, guessTarget, parseCsv, prepareRows, type Target } from "@/lib/csv-import";
import { dateLabel, fmt, fmt1 } from "@/lib/format";

interface Parsed {
  name: string;
  header: string[];
  data: string[][];
}

export default function ImporPage() {
  const router = useRouter();
  const [file, setFile] = useState<Parsed | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setReadError(null);
    try {
      const rows = parseCsv(await f.text());
      if (rows.length < 2) throw new Error("File tidak punya baris data. Pastikan baris pertama berisi nama kolom.");
      const [header, ...data] = rows;
      setFile({ name: f.name, header, data });
      setTargets(header.map(guessTarget));
    } catch (err) {
      setFile(null);
      setReadError(err instanceof Error ? err.message : "File tidak bisa dibaca. Pastikan formatnya CSV.");
    }
  }

  const prepared = useMemo(() => (file ? prepareRows(file.data, targets) : null), [file, targets]);
  const missing = [
    !targets.includes("date") && "Tanggal",
    !targets.includes("weightKg") && !targets.includes("weightLb") && "Berat",
  ].filter(Boolean) as string[];

  async function onImport() {
    if (!prepared?.rows.length) return;
    setBusy(true);
    try {
      const res = await api<{ imported: number }>("/weights/import", { body: { rows: prepared.rows } });
      const first = dateLabel(prepared.rows[0].date);
      const last = dateLabel(prepared.rows.at(-1)!.date);
      toast.success(`${fmt(res.imported)} hari diimpor (${first === last ? first : `${first} sampai ${last}`})`);
      router.push("/catat/berat");
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  const used = file ? file.header.map((h, i) => ({ h, i })).filter(({ i }) => targets[i] !== "ignore") : [];
  const unused = file ? file.header.map((h, i) => ({ h, i })).filter(({ i }) => targets[i] === "ignore") : [];
  const sample = (i: number) => file?.data.find((r) => r[i] && r[i] !== "-")?.[i] ?? "kosong";
  const setTarget = (i: number, t: Target) => setTargets((ts) => ts.map((x, j) => (j === i ? t : x)));

  const columnRow = ({ h, i }: { h: string; i: number }) => (
    <li key={i} className="flex flex-col gap-1.5 py-3">
      <label htmlFor={`col-${i}`} className="flex flex-col">
        <span className="font-semibold">{h || `Kolom ${i + 1}`}</span>
        <span className="truncate text-sm text-muted">Contoh: {sample(i)}</span>
      </label>
      <Select id={`col-${i}`} value={targets[i]} onChange={(e) => setTarget(i, e.target.value as Target)}>
        {TARGETS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
    </li>
  );

  return (
    <>
      <PageHeader title="Impor CSV" back="/catat/berat" />
      <div className="flex flex-col gap-6">
        <p className="text-muted">
          File ekspor dari InBody, Tanita, Zepp Life, Renpho, atau aplikasi timbangan lain. Kolomnya dikenali otomatis,
          cek dan ubah kalau ada yang salah. Liter dan kg otomatis diubah ke %.
        </p>

        <label className="pressable flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-line bg-surface px-4 font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          {file ? `Ganti file (${file.name})` : "Pilih file CSV"}
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="sr-only" />
        </label>
        {readError && (
          <p role="alert" className="text-danger">
            {readError}
          </p>
        )}

        {file && prepared && (
          <>
            <section aria-labelledby="kolom" className="flex flex-col">
              <h2 id="kolom" className="font-display text-2xl font-bold">
                Kolom yang diimpor ({used.length})
              </h2>
              {used.length > 0 ? (
                <ul className="divide-y divide-line">{used.map(columnRow)}</ul>
              ) : (
                <p className="py-3 text-muted">Belum ada kolom yang dikenali. Pilih manual dari daftar di bawah.</p>
              )}
              {unused.length > 0 && (
                <details className="border-t border-line">
                  <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-accent-ink">
                    {unused.length} kolom lain diabaikan
                  </summary>
                  <ul className="divide-y divide-line">{unused.map(columnRow)}</ul>
                </details>
              )}
            </section>

            <section aria-labelledby="hasil" aria-live="polite" className="flex flex-col gap-3">
              <h2 id="hasil" className="font-display text-2xl font-bold">
                Hasil
              </h2>
              {missing.length > 0 ? (
                <p role="alert" className="text-danger">
                  Pilih kolom untuk {missing.join(" dan ")} dulu.
                </p>
              ) : (
                <>
                  <p>
                    <strong>{fmt(prepared.rows.length)} hari</strong> siap diimpor
                    {prepared.rows.length > 0 &&
                      ` (${dateLabel(prepared.rows[0].date)}${
                        prepared.rows.length > 1 ? ` sampai ${dateLabel(prepared.rows.at(-1)!.date)}` : ""
                      })`}
                    . Data di tanggal yang sama akan diperbarui.
                  </p>
                  {prepared.rows.length > 0 && (
                    <ul className="flex flex-col divide-y divide-line border-y border-line">
                      {prepared.rows.slice(-5).map((r) => (
                        <li key={r.date} className="flex min-h-12 items-center justify-between gap-3 py-2">
                          <span>
                            <span className="block text-muted">{dateLabel(r.date)}</span>
                            <span className="text-sm">
                              {[
                                r.bodyFatPct != null && `Lemak ${fmt1(r.bodyFatPct)}%`,
                                r.waterPct != null && `Air ${fmt1(r.waterPct)}%`,
                                r.proteinPct != null && `Protein ${fmt1(r.proteinPct)}%`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="numeral shrink-0 text-2xl">
                            {fmt1(r.weightKg)} <span className="font-sans text-sm font-semibold text-muted">kg</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {prepared.dropped > 0 && (
                    <p className="text-sm text-muted">
                      {prepared.dropped} angka di luar rentang wajar tidak diimpor. Cek kolomnya kalau ini tidak sesuai.
                    </p>
                  )}
                  {prepared.skipped.length > 0 && (
                    <details>
                      <summary className="min-h-11 cursor-pointer text-sm font-semibold text-accent-ink">
                        {prepared.skipped.length} baris dilewati
                      </summary>
                      <ul className="text-sm text-muted">
                        {prepared.skipped.slice(0, 20).map((s) => (
                          <li key={s.line}>
                            Baris {s.line}: {s.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </section>

            <Button
              onClick={onImport}
              busy={busy}
              disabled={missing.length > 0 || prepared.rows.length === 0}
              className="w-full"
            >
              {prepared.rows.length ? `Impor ${fmt(prepared.rows.length)} hari` : "Impor"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
