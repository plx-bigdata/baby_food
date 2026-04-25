// cloudfunctions/getRecords/index.js — 拉取当前用户的辅食记录
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

// event: { babyId?, sinceISO?, limit? }
// 不传 babyId 则返回所有宝宝的记录
// 传 sinceISO 只拉该时间之后的增量
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  // 共享宝宝场景下记录的 _openid 是各成员自己的真身(云端 add 会强制覆盖),
  // 必须用 familyId 才能查到其他成员写的记录;退化场景按 _openid 查自己的
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
        // 历史兼容:owner 早期写的(_openid=owner,无 familyId)
        wheres.push({ _openid: ownerOpenid, babyId: babyClientId });
        // 历史兼容:member 早期写的(_openid=member,无 familyId)— 关键!
        // 否则 member 自己 familyId 改造前写的记录查不到,导致两端统计不一致
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

  const limit = Math.min(event.limit || 1000, 1000);

  try {
    const pageSize = 100;
    const allRecords = [];
    for (const where of wheres) {
      const countRes = await db.collection('food_records').where(where).count();
      const total = Math.min(countRes.total, limit);
      const pageCount = Math.ceil(total / pageSize);
      const tasks = [];
      for (let i = 0; i < pageCount; i++) {
        tasks.push(
          db.collection('food_records').where(where)
            .orderBy('recordTime', 'desc')
            .skip(i * pageSize).limit(pageSize).get()
        );
      }
      const results = await Promise.all(tasks);
      results.forEach(r => allRecords.push(...(r.data || [])));
    }
    // 多个 where 条件可能查到重复(老 owner 数据同时有 _openid 和 familyId),按 clientId/_id 去重
    const map = new Map();
    allRecords.forEach(x => { const k = x.clientId || x._id; if (k) map.set(k, x); });
    const records = Array.from(map.values());
    const deletedClientIds = records
      .filter(x => x.deletedAt)
      .map(x => x.clientId || x._id)
      .filter(Boolean);
    const activeRecords = records.filter(x => !x.deletedAt);
    return { code: 0, data: activeRecords, deletedClientIds, total: activeRecords.length };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
