// cloudfunctions/syncBabies/index.js — 宝宝档案的双向同步
// event.op:
//   'list'   -> 返回当前用户的所有宝宝
//   'upsert' -> 新增或更新(根据 clientId 去重), data: { babies: [...] }
//   'remove' -> 删除, data: { _id? , clientId? }
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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const op = event.op || 'list';

  try {
    if (op === 'list') {
      const own = await db.collection('babies')
        .where({ _openid: openid }).limit(100).get();
      const shared = await db.collection('babies')
        .where({ memberOpenids: openid }).limit(100).get();
      const map = new Map();
      [...(own.data || []), ...(shared.data || [])].forEach(b => {
        const key = b.clientId || b._id;
        if (key) {
          map.set(key, {
            ...b,
            _id: key,
            clientId: key,
            ownerOpenid: b.ownerOpenid || b._openid,
            sharedRole: (b.ownerOpenid || b._openid) === openid ? 'owner' : 'member',
          });
        }
      });
      return { code: 0, data: Array.from(map.values()) };
    }

    if (op === 'upsert') {
      const now = new Date().toISOString();
      const list = Array.isArray(event.data && event.data.babies)
        ? event.data.babies : [];
      const results = [];
      for (const b of list) {
        const key = b.clientId || b._id;
        const accessible = key ? await findAccessibleBaby(openid, key) : null;
        const ownerOpenid = accessible ? (accessible.ownerOpenid || accessible._openid) : openid;
        const doc = {
          ...b,
          _openid: ownerOpenid,
          ownerOpenid,
          clientId: key,
          memberOpenids: accessible && accessible.memberOpenids ? accessible.memberOpenids : [openid],
          updatedAt: now,
        };
        if (b.clientId) {
          const exist = await db.collection('babies')
            .where({ _openid: ownerOpenid, clientId: b.clientId })
            .limit(1).get();
          if (exist.data && exist.data.length > 0) {
            const updateData = { ...doc };
            delete updateData._id;
            delete updateData._openid;
            delete updateData.memberOpenids;
            await db.collection('babies').doc(exist.data[0]._id)
              .update({ data: updateData });
            results.push({ clientId: b.clientId, _id: exist.data[0]._id, action: 'update' });
            continue;
          }
        }
        doc.createdAt = b.createdAt || now;
        const res = await db.collection('babies').add({ data: doc });
        results.push({ clientId: b.clientId || null, _id: res._id, action: 'insert' });
      }
      return { code: 0, data: results };
    }

    if (op === 'remove') {
      const target = event.data || {};
      if (target._id) {
        const exist = await db.collection('babies')
          .where({ _id: target._id, _openid: openid })
          .limit(1).get();
        if (exist.data && exist.data.length > 0) {
          await db.collection('babies').doc(exist.data[0]._id).remove();
        }
        return { code: 0 };
      }
      if (target.clientId) {
        const exist = await db.collection('babies')
          .where({ _openid: openid, clientId: target.clientId })
          .limit(1).get();
        if (exist.data && exist.data.length > 0) {
          await db.collection('babies').doc(exist.data[0]._id).remove();
        }
        return { code: 0 };
      }
      return { code: -1, message: 'no id' };
    }

    return { code: -1, message: 'unknown op' };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
