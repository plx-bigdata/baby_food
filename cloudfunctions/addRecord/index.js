// cloudfunctions/addRecord/index.js — 新增/批量新增辅食记录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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

// event 可传 { record: {...} } 或 { records: [{...}, {...}] }
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const list = Array.isArray(event.records)
    ? event.records
    : event.record ? [event.record] : [];
  if (list.length === 0) return { code: -1, message: 'empty record' };

  try {
    const now = new Date();
    const results = [];
    for (const r of list) {
      const access = await findAccessibleBaby(openid, r.babyId || '');
      const ownerOpenid = access ? (access.ownerOpenid || access._openid) : openid;
      const babyClientId = access ? (access.clientId || access._id) : (r.babyId || '');
      // 共享宝宝场景下,云端 add() 会强制把 _openid 设为调用者真身,无法跨 openid 查询
      // 统一用 familyId 作为跨 openid 的共享键(无 familyId 则退化到自己的 openid)
      const familyId = access && access.familyId
        ? access.familyId
        : `solo_${ownerOpenid}_${babyClientId}`;
      const doc = {
        ...r,
        authorOpenid: openid,
        ownerOpenid,
        familyId,
        babyId: babyClientId,
        foodId: r.foodId || '',
        recordTime: r.recordTime || now.toISOString(),
        createdAt: r.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      };
      delete doc._openid;
      // 用 clientId（本地生成的 _id）去重:先查再写
      // 查询用 familyId(支持跨 openid),退化用 _openid(自己写的旧数据)
      if (doc.clientId) {
        const existByFamily = await db.collection('food_records')
          .where({ familyId, clientId: doc.clientId })
          .limit(1).get();
        const existByOwner = (existByFamily.data && existByFamily.data.length > 0)
          ? existByFamily
          : await db.collection('food_records')
              .where({ _openid: openid, clientId: doc.clientId })
              .limit(1).get();
        if (existByOwner.data && existByOwner.data.length > 0) {
          await db.collection('food_records').doc(existByOwner.data[0]._id).update({ data: doc });
          results.push({ clientId: doc.clientId, _id: existByOwner.data[0]._id, action: 'update' });
          continue;
        }
      }
      const res = await db.collection('food_records').add({ data: doc });
      results.push({ clientId: doc.clientId || null, _id: res._id, action: 'insert' });
    }
    return { code: 0, data: results };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
