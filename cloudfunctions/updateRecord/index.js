// cloudfunctions/updateRecord/index.js — 更新辅食记录
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

// event: { clientId: 'xxx', data: {...} } 通过 clientId 找记录
// 或 { _id: 'xxx', data: {...} } 通过云端 _id
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const data = {
    ...(event.data || {}),
    updatedAt: new Date().toISOString(),
  };
  delete data._id;
  delete data._openid;

  try {
    const access = data.babyId ? await findAccessibleBaby(openid, data.babyId) : null;
    const ownerOpenid = access ? (access.ownerOpenid || access._openid) : openid;
    const familyId = (access && access.familyId) || '';
    if (access) {
      data.babyId = access.clientId || access._id;
      if (familyId) data.familyId = familyId;
    }
    if (event._id) {
      const exist = await db.collection('food_records').doc(event._id).get().catch(() => null);
      if (!exist || !exist.data) return { code: -1, message: 'not found' };
      const doc = exist.data;
      const allowed = (doc._openid === openid)
        || (familyId && doc.familyId === familyId)
        || (doc._openid === ownerOpenid);
      if (!allowed) return { code: -1, message: 'no permission' };
      await db.collection('food_records').doc(event._id).update({ data });
      return { code: 0, _id: event._id };
    }
    if (event.clientId) {
      let exist = familyId
        ? await db.collection('food_records').where({ familyId, clientId: event.clientId }).limit(1).get()
        : { data: [] };
      if (!exist.data || exist.data.length === 0) {
        exist = await db.collection('food_records')
          .where({ _openid: ownerOpenid, clientId: event.clientId }).limit(1).get();
      }
      if (!exist.data || exist.data.length === 0) {
        exist = await db.collection('food_records')
          .where({ _openid: openid, clientId: event.clientId }).limit(1).get();
      }
      if (!exist.data || exist.data.length === 0) return { code: -1, message: 'not found' };
      await db.collection('food_records').doc(exist.data[0]._id).update({ data });
      return { code: 0, _id: exist.data[0]._id };
    }
    return { code: -1, message: 'no id' };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
