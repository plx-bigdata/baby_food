// cloudfunctions/deleteAccount/index.js — 注销账号:清空当前 openid 全部业务数据
// 合规要求(工信部《移动互联网应用程序信息服务管理规定》):必须提供账号注销能力
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTIONS = ['food_records', 'allergy_log', 'babies', 'family_shares', 'report_shares'];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const results = {};
  for (const name of COLLECTIONS) {
    try {
      // 云开发 where.remove() 单次最多 100 条,循环删直到没有
      let total = 0;
      while (true) {
        const batch = await db.collection(name)
          .where({ _openid: openid })
          .limit(100)
          .get();
        if (!batch.data || batch.data.length === 0) break;
        for (const doc of batch.data) {
          try {
            await db.collection(name).doc(doc._id).remove();
            total++;
          } catch (_) {}
        }
        if (batch.data.length < 100) break;
      }
      results[name] = total;
    } catch (err) {
      results[name] = `error: ${String(err)}`;
    }
  }

  return { code: 0, data: results };
};
