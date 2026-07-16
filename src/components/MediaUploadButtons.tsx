import { useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Film, Image as ImageIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  MAX_ATTACHED_FILES,
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_VIDEO_DURATION,
  MAX_VIDEO_FILE_SIZE_MB,
} from '../utils';

type ExpandingUploadButtonProps = {
  icon: LucideIcon;
  label: string;
  standard: string;
  expandedWidth: number;
  disabled: boolean;
  onClick: () => void;
};

function ExpandingUploadButton({
  icon: Icon,
  label,
  standard,
  expandedWidth,
  disabled,
  onClick,
}: ExpandingUploadButtonProps) {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const expanded = active && !disabled;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setActive(true)}
      onHoverEnd={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      initial={false}
      animate={{
        width: expanded ? expandedWidth : 40,
        boxShadow: expanded
          ? '0 0 24px rgba(91, 239, 144, 0.32)'
          : '0 0 0 rgba(91, 239, 144, 0)',
      }}
      transition={reduceMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 380, damping: 28 }}
      className="group relative flex h-10 shrink-0 items-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 text-primary disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`上传${label}`}
      aria-expanded={expanded}
      title={disabled ? '已达最大文件数量' : `上传${label}：${standard}`}
    >
      {!reduceMotion && (
        <span className="pointer-events-none absolute inset-y-0 -left-12 w-10 -skew-x-12 bg-gradient-to-r from-transparent via-primary/25 to-transparent transition-transform duration-700 group-hover:translate-x-[300px]" />
      )}

      <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
        <Icon className="h-5 w-5" />
      </span>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="relative z-10 whitespace-nowrap pr-4 text-xs font-medium"
          >
            {label} · {standard}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

type MediaUploadButtonsProps = {
  imageInputRef: RefObject<HTMLInputElement | null>;
  videoInputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageClick: () => void;
  onVideoClick: () => void;
};

export function MediaUploadButtons({
  imageInputRef,
  videoInputRef,
  disabled,
  onFileSelect,
  onImageClick,
  onVideoClick,
}: MediaUploadButtonsProps) {
  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        onChange={onFileSelect}
        className="hidden"
        accept="image/*"
        multiple
      />
      <input
        ref={videoInputRef}
        type="file"
        onChange={onFileSelect}
        className="hidden"
        accept="video/*,.mp4,.mov,.avi,.wmv,.flv,.mkv,.webm"
        multiple
      />
      <ExpandingUploadButton
        icon={ImageIcon}
        label="图片"
        standard={`单张 ≤ ${MAX_IMAGE_FILE_SIZE_MB} MB · 最多 ${MAX_ATTACHED_FILES} 个`}
        expandedWidth={220}
        disabled={disabled}
        onClick={onImageClick}
      />
      <ExpandingUploadButton
        icon={Film}
        label="视频"
        standard={`单个 ≤ ${MAX_VIDEO_FILE_SIZE_MB} MB · 最长 ${MAX_VIDEO_DURATION} 秒`}
        expandedWidth={250}
        disabled={disabled}
        onClick={onVideoClick}
      />
    </>
  );
}
