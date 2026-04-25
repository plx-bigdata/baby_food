// cloudfunctions/addAllergyLog/index.js — 新增过敏记录
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

// event: { log: {...} } 或 { logs: [...] }
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const list = Array.isArray(event.logs)
    ? event.logs
    : event.log ? [event.log] : [];
  if (list.length === 0) return { code: -1, message: 'empty log' };

  try {
    const now = new Date();
    const results = [];
    for (const l of list) {
      const access = await findAccessibleBaby(openid, l.babyId || '');
      const ownerOpenid = access ? (access.ownerOpenid || access._openid) : openid;
      const babyClientId = access ? (access.clientId || access._id) : (l.babyId || '');
      const familyId = access && access.familyId
        ? access.familyId
        : `solo_${ownerOpenid}_${babyClientId}`;
      const doc = {
        ...l,
        authorOpenid: openid,
        ownerOpenid,
        familyId,
        babyId: babyClientId,
        createdAt: l.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      };
      delete doc._openid;
      if (doc.clientId) {
        const existByFamily = await db.collection('allergy_log')
          .where({ familyId, clientId: doc.clientId })
          .limit(1).get();
        const existByOwner = (existByFamily.data && existByFamily.data.length > 0)
          ? existByFamily
          : await db.collection('allergy_log')
              .where({ _openid: openid, clientId: doc.clientId })
              .limit(1).get();
        if (existByOwner.data && existByOwner.data.length > 0) {
          await db.collection('allergy_log').doc(existByOwner.data[0]._id).update({ data: doc });
          results.push({ clientId: doc.clientId, _id: existByOwner.data[0]._id, action: 'update' });
          continue;
        }
      }
      const res = await db.collection('allergy_log').add({ data: doc });
      results.push({ clientId: doc.clientId || null, _id: res._id, action: 'insert' });
    }
    return { code: 0, data: results };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
