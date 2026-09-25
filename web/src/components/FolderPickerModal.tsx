import React, { useEffect, useState } from 'react';

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderPath: string) => void;
  initialPath?: string;
}

export function FolderPickerModal({ isOpen, onClose, onSelect, initialPath }: FolderPickerModalProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [dirs, setDirs] = useState<string[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const loadFolder = async (dirPath?: string | null) => {
    setLoading(true);
    setErr('');
    try {
      const q = dirPath ? `?path=${encodeURIComponent(dirPath)}` : '';
      const res = await fetch(`/api/folders${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cannot read directory');
      setCurrentPath(data.path);
      setParent(data.parent);
      setDirs(data.dirs ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFolder(initialPath || null);
    }
  }, [isOpen, initialPath]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          padding: 22,
          maxWidth: 580,
          width: '100%',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="display-font" style={{ margin: 0, fontSize: 17 }}>Choose Server Export Folder</h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text2)' }}>
          Works across any phone, tablet, or browser. Navigates the host server filesystem directly.
        </p>

        {err && (
          <div style={{ color: 'var(--rose)', fontSize: 12, marginBottom: 8 }}>
            Error: {err}
          </div>
        )}

        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: 'var(--input-bg)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text)',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span className="mono-font" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📁 {currentPath ?? 'Select drive / root'}
          </span>
          {parent && (
            <button
              onClick={() => loadFolder(parent)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 11,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ↑ Up
            </button>
          )}
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--input-bg)',
          padding: 6,
          minHeight: 220,
        }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
              Scanning directories…
            </div>
          ) : dirs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No subdirectories in this location.
            </div>
          ) : (
            dirs.map((d) => (
              <div
                key={d}
                onClick={() => {
                  const next = currentPath
                    ? (currentPath.endsWith('\\') || currentPath.endsWith('/')
                        ? `${currentPath}${d}`
                        : `${currentPath}\\${d}`)
                    : d;
                  loadFolder(next);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span>📁</span>
                <span className="mono-font" style={{ flex: 1 }}>{d}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>→</span>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text2)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            disabled={!currentPath}
            onClick={() => {
              if (currentPath) {
                onSelect(currentPath);
                onClose();
              }
            }}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: currentPath ? 'var(--gradient-btn)' : 'var(--border)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: currentPath ? 'pointer' : 'not-allowed',
            }}
          >
            Choose This Folder
          </button>
        </div>
      </div>
    </div>
  );
}
