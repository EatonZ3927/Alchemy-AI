import { useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';

export function SaveImageButton({ userContent, model, modelType, reasoning, prompt, chatboxUrl }: {
  userContent: string;
  model: string;
  modelType?: string;
  reasoning?: string;
  prompt?: string;
  chatboxUrl?: string;
}) {
  const [saving, setSaving] = useState(false);

  const handleSaveImage = async () => {
    setSaving(true);

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 40px;
      background: linear-gradient(135deg, #0e0e0e 0%, #1a1919 100%);
      font-family: 'Inter', sans-serif;
    `;

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 12px;">
          <span style="font-size: 28px; font-weight: 800; color: #ffffff; font-family: 'Manrope', sans-serif;">炼金术</span>
          <span style="font-size: 28px; font-weight: 800; color: #6bfe9c; font-family: 'Manrope', sans-serif;">AI</span>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 0 12px rgba(0,255,65,0.5));">
            <path d="M9.5 3H14.5M10.5 3V8.5L5.2 18.2C4.6 19.3 5.4 20.5 6.6 20.5H17.4C18.6 20.5 19.4 19.3 18.8 18.2L13.5 8.5V3H10.5Z" stroke="#00FF41" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            <path d="M7.5 11.5L4.5 17.5C4.2 18.1 4.5 19 5.2 19H18.8C19.5 19 19.8 18.1 19.5 17.5L16.5 11.5H7.5Z" fill="#00FF41" fill-opacity="0.3"/>
          </svg>
        </div>
        <div style="height: 4px; width: 120px; background: linear-gradient(90deg, transparent, #6bfe9c, transparent); margin: 16px auto 0;"></div>
      </div>

      <div style="background: #201f1f; border-radius: 16px; padding: 24px; margin-bottom: 24px; border-left: 3px solid #6bfe9c;">
        <div style="font-size: 11px; font-weight: 700; color: #adaaaa; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">用户需求</div>
        <div style="color: #ffffff; line-height: 1.6; white-space: pre-wrap;">${userContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>

      <div style="background: #1a1919; border-radius: 16px; padding: 28px; border: 1px solid #494847;">
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #adaaaa; letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase;">推荐模型</div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 22px; font-weight: 700; color: #6bfe9c; font-family: 'Manrope', sans-serif;">${model}</span>
            <span style="background: rgba(138,242,255,0.15); color: #8af2ff; font-size: 11px; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(138,242,255,0.25);">${modelType || 'PRO'}</span>
          </div>
        </div>

        <div style="background: #131313; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #6bfe9c; letter-spacing: 1.5px; margin-bottom: 10px; text-transform: uppercase;">推荐理由</div>
          <div style="color: #adaaaa; line-height: 1.6; font-size: 14px;">${(reasoning || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>

        <div style="background: #262626; border-radius: 12px; padding: 20px; border: 1px solid rgba(107,254,156,0.15);">
          <div style="font-size: 11px; font-weight: 700; color: #adaaaa; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">优化后的提示词</div>
          <div style="color: #5bef90; line-height: 1.7; white-space: pre-wrap; font-family: monospace; font-size: 14px; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;">${(prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #494847;">
        <div style="font-size: 10px; color: #ffffff; letter-spacing: 2px; opacity: 0.6; text-transform: uppercase;">炼金术士 AI · 提示词工坊</div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#0e0e0e',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `炼金术AI-词图-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('保存词图失败:', error);
    } finally {
      document.body.removeChild(container);
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleSaveImage}
      disabled={saving}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary/10 hover:bg-tertiary/20 border border-tertiary/20 rounded-lg text-xs text-tertiary transition-colors disabled:opacity-50"
    >
      <Download className="w-3.5 h-3.5" />
      <span>{saving ? '生成中...' : '保存词图'}</span>
    </button>
  );
}