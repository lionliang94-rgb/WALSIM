import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  SHARD_SINNERS,
  ShardImportError,
  getApiKey,
  recognizeShards,
  usesProxy,
} from '../lib/shardVision';

interface SinnerLike {
  id: string;
  name: string;
  color: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (values: Record<string, number>) => void;
  sinners: SinnerLike[];
}

interface Row {
  id: string;
  name: string;
  color: string;
  value: string;
  checked: boolean;
  recognized: boolean;
}

const EMPTY_ERROR = null;

export function ShardImportModal({ open, onClose, onApply, sinners }: Props) {
  const [preview, setPreview] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(EMPTY_ERROR);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);

  const fileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const metaById = useMemo(() => {
    const map: Record<string, SinnerLike> = {};
    for (const sinner of sinners) map[sinner.id] = sinner;
    for (const sinner of SHARD_SINNERS) {
      if (!map[sinner.id]) map[sinner.id] = { id: sinner.id, name: sinner.name, color: '#a1a1aa' };
    }
    return map;
  }, [sinners]);

  const reset = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = '';
    fileRef.current = null;
    setPreview('');
    setFileName('');
    setRows(null);
    setCached(false);
    setBusy(false);
    setError(EMPTY_ERROR);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  // 关闭弹窗（或组件卸载）时中断还在跑的识别请求，别白烧额度
  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const acceptFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError({ message: '这不是图片文件', hint: '支持 PNG / JPG / WebP 截图。' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError({ message: '图片太大了（超过 25MB）', hint: '裁剪到只剩碎片区域再上传。' });
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    fileRef.current = file;
    setPreview(url);
    setFileName(file.name || '截图');
    setRows(null);
    setCached(false);
    setError(EMPTY_ERROR);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            acceptFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, acceptFile]);

  const handleRecognize = async (options: { force?: boolean } = {}) => {
    const file = fileRef.current;
    if (!file) return;
    const apiKey = getApiKey();
    if (!usesProxy && !apiKey) {
      setError({ message: '识别服务暂时不可用', hint: '稍后再试一次。' });
      return;
    }

    // 上一次还在跑就先取消，避免两个请求抢结果
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setError(EMPTY_ERROR);
    try {
      const { readings, cached: fromCache } = await recognizeShards(file, apiKey, {
        signal: controller.signal,
        force: options.force,
      });
      setCached(Boolean(fromCache));
      const byId = new Map(readings.map((r) => [r.id, r.shards]));
      const next: Row[] = Object.keys(metaById).map((id) => {
        const value = byId.get(id);
        return {
          id,
          name: metaById[id].name,
          color: metaById[id].color,
          value: value === undefined ? '' : String(value),
          checked: value !== undefined,
          recognized: value !== undefined,
        };
      });
      // 按游戏内顺序排，未识别的排在后面
      next.sort((a, b) => Number(b.recognized) - Number(a.recognized));
      setRows(next);
    } catch (err) {
      if (controller.signal.aborted) return; // 用户取消，不报错
      if (err instanceof ShardImportError) setError({ message: err.message, hint: err.hint });
      else setError({ message: '识别失败', hint: String((err as Error)?.message ?? err) });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => (prev ? prev.map((row) => (row.id === id ? { ...row, ...patch } : row)) : prev));
  };

  const apply = () => {
    if (!rows) return;
    const values: Record<string, number> = {};
    for (const row of rows) {
      if (!row.checked || row.value === '') continue;
      const num = Math.max(0, Math.min(99999, parseInt(row.value, 10) || 0));
      values[row.id] = num;
    }
    onApply(values);
    onClose();
  };

  const recognizedCount = rows?.filter((r) => r.recognized).length ?? 0;
  const checkedCount = rows?.filter((r) => r.checked && r.value !== '').length ?? 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="截图导入碎片"
    >
      <div
        className="w-full max-w-lg bg-[#151722] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900">
          <div className="flex items-center gap-2">
            <Camera className="w-4.5 h-4.5 text-amber-400" />
            <span className="font-bold text-sm text-amber-200">截图导入碎片</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              AI 识别
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 p-1 rounded" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* 选图区 */}
          {!preview ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                acceptFile(event.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                dragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-zinc-700 hover:border-amber-500/60 hover:bg-zinc-900/60'
              }`}
            >
              <ImagePlus className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
              <div className="text-sm font-bold text-zinc-200">点击选图，或把截图拖进来</div>
              <div className="text-[11px] text-zinc-500 mt-1">
                也可以直接 Ctrl+V 粘贴 · 支持 PNG / JPG / WebP
              </div>

              {/* 使用范例（灰显，仅作示意，不接收点击） */}
              <div className="mt-3 flex flex-col items-center gap-1 pointer-events-none select-none">
                <img
                  src="./images/shard-import-example.jpg"
                  alt="碎片截图示例"
                  className="w-full max-w-[300px] rounded-md border border-zinc-800 opacity-45 grayscale-[30%]"
                  loading="lazy"
                />
                <span className="text-[10px] text-zinc-600">
                  范例：能看清 12 位罪人的碎片数字即可
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-black/50">
                <img src={preview} alt="待识别截图" className="w-full max-h-52 object-contain" />
                <button
                  onClick={() => {
                    reset();
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-zinc-300 hover:text-white rounded p-1"
                  title="移除这张图"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500 font-mono truncate">{fileName}</span>
                <button
                  onClick={() => {
                    reset();
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline shrink-0"
                >
                  换一张
                </button>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />

          {/* 错误 */}
          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-rose-200">{error.message}</div>
                {error.hint && <div className="text-[11px] text-rose-200/70 mt-0.5 break-words">{error.hint}</div>}
              </div>
            </div>
          )}

          {/* 识别结果 */}
          {rows && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">
                  识别到 <strong className="text-emerald-400">{recognizedCount}</strong> 位罪人 · 待写入{' '}
                  <strong className="text-amber-300">{checkedCount}</strong> 位
                  {cached && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px]">
                      本地缓存
                    </span>
                  )}
                </span>
                <button
                  onClick={() =>
                    setRows((prev) =>
                      prev ? prev.map((row) => ({ ...row, checked: row.value !== '' })) : prev,
                    )
                  }
                  className="text-zinc-400 hover:text-zinc-200 underline"
                >
                  全选已识别
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800/80">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-900/60">
                    <button
                      onClick={() => updateRow(row.id, { checked: !row.checked })}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                        row.checked
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'border-zinc-600 text-transparent hover:border-zinc-400'
                      }`}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </button>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="text-xs text-zinc-200 flex-1 truncate">{row.name}</span>
                    <input
                      value={row.value}
                      inputMode="numeric"
                      placeholder="未识别"
                      onChange={(event) =>
                        updateRow(row.id, {
                          value: event.target.value.replace(/[^\d]/g, '').slice(0, 5),
                          checked: true,
                        })
                      }
                      className={`w-20 bg-black/60 border rounded px-2 py-0.5 text-xs font-mono text-right outline-none ${
                        row.value === ''
                          ? 'border-zinc-700 text-zinc-500 placeholder:text-zinc-600'
                          : 'border-emerald-600/50 text-emerald-300 focus:border-amber-400'
                      }`}
                    />
                    <span className="text-[10px] text-zinc-500 w-3">碎</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <div className="flex gap-2 shrink-0">
              {rows ? (
                <>
                  <button
                    onClick={() => handleRecognize({ force: true })}
                    disabled={busy}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 disabled:opacity-50"
                  >
                    重新识别
                  </button>
                  <button
                    onClick={apply}
                    disabled={checkedCount === 0}
                    className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    写入 {checkedCount} 位
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRecognize()}
                  disabled={!preview || busy}
                  className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> 识别中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> 开始识别
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
