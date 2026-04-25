// utils/security.js — UGC 文本安全检测封装

/**
 * 检查一段文本是否通过安全检测。
 * @param {string} text 要检查的文本(允许为空,空文本直接放行)
 * @param {object} [opts]
 * @param {number} [opts.scene=2] 场景:1=资料 2=评论 3=论坛 4=社交日志
 * @returns {Promise<{ok: boolean, reason?: string}>}
 *   ok=true 表示放行;ok=false 表示不应保存
 *   接口异常时 ok=true(不阻塞用户),但会 console.warn
 */
async function checkText(text, opts = {}) {
  const content = (text || '').trim();
  if (!content) return { ok: true };

  // 太短(<5 字符)微信接口会直接拒,跳过检查
  if (content.length < 5) return { ok: true };

  if (!wx.cloud) return { ok: true };

  try {
    const res = await wx.cloud.callFunction({
      name: 'secCheck',
      data: { content, scene: opts.scene || 2 },
    });
    const result = res && res.result;
    if (!result) return { ok: true };
    // 云函数异常 → 不阻塞
    if (result.code !== 0) return { ok: true };
    if (result.pass === false) {
      return { ok: false, reason: result.label || '内容不合规' };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[security.checkText] call failed', err);
    return { ok: true };
  }
}

module.exports = {
  checkText,
};
