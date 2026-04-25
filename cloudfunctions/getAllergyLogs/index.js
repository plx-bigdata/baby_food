// cloudfunctions/getAllergyLogs/index.js — 拉取过敏记录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function findAccessibleBaby(openid, babyId) {
  if (!babyId) return null;
  let res = await db.collection('babies').where({ _openid: openid, clientId: babyId }).limit(1).get();
  if (res.data && res.data.length > 0) return res.data[0];
  res = await db.collection('babies').where({ _openid: openid, _id: babyId }).limit(1).get();
  if (res.data && res.data.length > 0) return res.data[0];
  res = await db.collection('babies').where({ clientId: babyId, memberOpenids: openid }).limit(1).get();
  if (res.data && res.data.length > 0) return res.data[0];
  res = await db.collection('babies').where({ _id: babyId, memberOpenids: openid }).limit(1).get();
  return (res.data && res.data[0]) || null;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  // 共享宝宝场景下记录的 _openid 是各成员自己的真身,必须用 familyId 才能跨成员查询
  // 同时兼容历史数据(owner 加入家庭前写的没有 familyId 字段)
  const wheres = [];
  if (event.babyId) {
    const access = await findAccessibleBaby(openid, event.babyId);
    if (access) {
      const familyId = access.familyId;
      const babyClientId = access.clientId || access._id;
      const ownerOpenid = access.ownerOpenid || access._openid;
      if (familyId) {
        wheres.push({ familyId, babyId: babyClientId });
        wheres.push({ _openid: ownerOpenid, babyId: babyClientId });
        if (openid !== ownerOpenid) {
          wheres.push({ _openid: openid, babyId: babyClientId });
        }
      } else {
        wheres.push({ _openid: ownerOpenid, babyId: babyClientId });
      }
    } else {
      wheres.push({ _openid: openid, babyId: event.babyId });
    }
  } else {
    wheres.push({ _openid: openid });
  }
  if (event.sinceISO) {
    wheres.forEach(w => { w.updatedAt = _.gte(event.sinceISO); });
  }

  try {
    const pageSize = 100;
    const allLogs = [];
    for (const where of wheres) {
      const countRes = await db.collection('allergy_log').where(where).count();
      const total = countRes.total;
      const pageCount = Math.ceil(total / pageSize);
      const tasks = [];
      for (let i = 0; i < pageCount; i++) {
        tasks.push(
          db.collection('allergy_log').where(where)
            .orderBy('occurredAt', 'desc')
            .skip(i * pageSize).limit(pageSize).get()
        );
      }
      const results = await Promise.all(tasks);
      results.forEach(r => allLogs.push(...(r.data || [])));
    }
    const map = new Map();
    allLogs.forEach(x => { const k = x.clientId || x._id; if (k) map.set(k, x); });
    const logs = Array.from(map.values());
    const deletedClientIds = logs
      .filter(x => x.deletedAt)
      .map(x => x.clientId || x._id)
      .filter(Boolean);
    const activeLogs = logs.filter(x => !x.deletedAt);
    return { code: 0, data: activeLogs, deletedClientIds, total: activeLogs.length };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
