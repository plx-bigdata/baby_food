// cloudfunctions/deleteAllergyLog/index.js — 删除过敏记录
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

async function markDeleted(logId, openid) {
  await db.collection('allergy_log').doc(logId).update({
    data: {
      deletedAt: new Date().toISOString(),
      deletedBy: openid,
      updatedAt: new Date().toISOString(),
    },
  });
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  try {
    let access = null;
    let ownerOpenid = openid;
    let familyId = '';
    if (event.babyId) {
      access = await findAccessibleBaby(openid, event.babyId);
      ownerOpenid = access ? (access.ownerOpenid || access._openid) : openid;
      familyId = (access && access.familyId) || '';
    }
    if (event._id) {
      const exist = await db.collection('allergy_log').doc(event._id).get().catch(() => null);
      if (!exist || !exist.data) return { code: 0 };
      const doc = exist.data;
      const allowed = (doc._openid === openid)
        || (familyId && doc.familyId === familyId)
        || (doc._openid === ownerOpenid);
      if (!allowed) return { code: -1, message: 'no permission' };
      await markDeleted(event._id, openid);
      return { code: 0 };
    }
    if (event.clientId) {
      let exist = familyId
        ? await db.collection('allergy_log').where({ familyId, clientId: event.clientId }).limit(1).get()
        : { data: [] };
      if (!exist.data || exist.data.length === 0) {
        exist = await db.collection('allergy_log')
          .where({ _openid: ownerOpenid, clientId: event.clientId }).limit(1).get();
      }
      if (!exist.data || exist.data.length === 0) {
        exist = await db.collection('allergy_log')
          .where({ _openid: openid, clientId: event.clientId }).limit(1).get();
      }
      if (!exist.data || exist.data.length === 0) return { code: 0 };
      await markDeleted(exist.data[0]._id, openid);
      return { code: 0 };
    }
    return { code: -1, message: 'no id' };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
