import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';

interface PersonAvatarProps {
  name: string;
  size?: 'sm' | 'md';
  assigned?: boolean;
  onToggle?: () => void;
  showName?: boolean;
}

export default function PersonAvatar({
  name,
  size = 'sm',
  assigned = false,
  onToggle,
  showName = false,
}: PersonAvatarProps) {
  const px = size === 'md' ? 48 : 32;
  const borderWidth = size === 'md' ? 3 : 2;

  const svgDataUri = useMemo(() => {
    const avatar = createAvatar(funEmoji, { seed: name, size: px });
    return avatar.toDataUri();
  }, [name, px]);

  const borderColor = assigned ? 'var(--color-purple)' : 'var(--color-muted-surface)';
  const boxShadow = assigned ? 'var(--glow-purple)' : 'none';

  const img = (
    <div style={{ position: 'relative', width: px, height: px, flexShrink: 0 }}>
      <img
        src={svgDataUri}
        alt={name}
        width={px}
        height={px}
        style={{
          borderRadius: '50%',
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow,
          display: 'block',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      {assigned && (
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: 'var(--color-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 10 10">
            <path d="M2 5 L4.5 7.5 L8 3" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );

  if (!onToggle) {
    return showName ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {img}
        <span style={{ fontSize: 10, color: assigned ? 'var(--color-purple)' : 'var(--color-muted)', fontWeight: 600, textAlign: 'center', maxWidth: px + 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
    ) : img;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {img}
      {showName && (
        <span style={{ fontSize: 10, color: assigned ? 'var(--color-purple)' : 'var(--color-muted)', fontWeight: 600, textAlign: 'center', maxWidth: px + 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      )}
    </button>
  );
}
