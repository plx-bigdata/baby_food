// cloudfunctions/secCheck/index.js — UGC 文本安全检测
// 调用微信 security.msgSecCheck,过审必备
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// event: { content: string, scene?: 1|2|3|4 }
// scene: 1=资料, 2=评论, 3=论坛, 4=社交日志
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const content = (event.content || '').trim();
  // 空文本视为安全,直接放行
  if (!content) return { code: 0, pass: true };

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: event.scene || 2,
      openid,
      content,
    });
    // errcode 0 = 安全;87014 = 违规
    const pass = res && res.errCode === 0 && (!res.result || res.result.suggest === 'pass');
    return {
      code: 0,
      pass,
      suggest: res && res.result && res.result.suggest,
      label: res && res.result && res.result.label,
    };
  } catch (err) {
    // 接口异常不阻塞用户正常操作,但记录日志
    console.warn('[secCheck] error', err);
    return { code: -1, pass: true, message: String(err) };
  }
};
