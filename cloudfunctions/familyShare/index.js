// cloudfunctions/familyShare/index.js — 家庭共享邀请
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function makeFamilyId(ownerOpenid, baby) {
  return baby.familyId || `fam_${ownerOpenid}_${baby.clientId || baby._id || Date.now()}`;
}

async function findBabyForOwner(ownerOpenid, baby) {
  const clientId = baby && (baby.clientId || baby._id);
  if (!clientId) return null;
  let res = await db.collection('babies')
    .where({ _openid: ownerOpenid, clientId })
    .limit(1)
    .get();
  if (res.data && res.data.length > 0) return res.data[0];
  res = await db.collection('babies')
    .where({ _openid: ownerOpenid, _id: clientId })
    .limit(1)
    .get();
  return (res.data && res.data[0]) || null;
}

async function ensureBabyForOwner(ownerOpenid, baby, familyId) {
  const existing = await findBabyForOwner(ownerOpenid, baby);
  if (existing) return existing;
  const now = new Date().toISOString();
  const clientId = baby.clientId || baby._id || `baby_${Date.now()}`;
  const doc = {
    ...baby,
    _openid: ownerOpenid,
    _id: undefined,
    clientId,
    familyId,
    ownerOpenid,
    memberOpenids: [ownerOpenid],
    createdAt: baby.createdAt || now,
    updatedAt: now,
  };
  delete doc._id;
  const res = await db.collection('babies').add({ data: doc });
  return { ...doc, _id: res._id };
}

async function getShareByCode(shareCode) {
  const code = String(shareCode || '').trim().toUpperCase();
  if (!code) return null;
  const res = await db.collection('family_shares')
    .where({ shareCode: code })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  return (res.data && res.data[0]) || null;
}

async function getReportByCode(reportCode) {
  const code = String(reportCode || '').trim().toUpperCase();
  if (!code) return null;
  const res = await db.collection('report_shares')
    .where({ reportCode: code })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  return (res.data && res.data[0]) || null;
}

async function listByPages(collection, where, orderField) {
  const pageSize = 100;
  const countRes = await db.collection(collection).where(where).count();
  const total = countRes.total || 0;
  const pageCount = Math.ceil(total / pageSize);
  const tasks = [];
  for (let i = 0; i < pageCount; i++) {
    let query = db.collection(collection).where(where);
    if (orderField) query = query.orderBy(orderField, 'desc');
    tasks.push(query.skip(i * pageSize).limit(pageSize).get());
  }
  const results = await Promise.all(tasks);
  return results.reduce((acc, r) => acc.concat(r.data || []), []);
}

function dedupByClientId(arrs) {
  const map = new Map();
  arrs.forEach(arr => (arr || []).forEach(x => {
    const k = x.clientId || x._id;
    if (k) map.set(k, x);
  }));
  return Array.from(map.values());
}

async function backfillSharedItems(collection, items, openid, ownerOpenid, familyId, babyClientId) {
  const results = [];
  for (const item of items || []) {
    const clientId = item.clientId || item._id;
    if (!clientId) continue;
    const exist = await db.collection(collection)
      .where({ familyId, clientId })
      .limit(1)
      .get();
    const doc = {
      ...item,
      clientId,
      babyId: babyClientId,
      ownerOpenid,
      familyId,
      authorOpenid: item.authorOpenid || ownerOpenid,
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
    delete doc._id;
    delete doc._openid;
    if (exist.data && exist.data.length > 0) {
      await db.collection(collection).doc(exist.data[0]._id).update({ data: doc });
      results.push({ ...item, ...doc, _id: exist.data[0]._id });
    } else {
      const res = await db.collection(collection).add({ data: doc });
      results.push({ ...item, ...doc, _id: res._id });
    }
  }
  return results;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: -1, message: 'no openid' };

  const op = event.op || 'preview';

  try {
    if (op === 'create') {
      const baby = event.baby || {};
      const shareCode = String(event.shareCode || '').trim().toUpperCase();
      if (!baby || !shareCode) return { code: -1, message: 'missing baby or shareCode' };

      const ownerBaby = await findBabyForOwner(openid, baby);
      const familyId = makeFamilyId(openid, ownerBaby || baby);
      const ensuredBaby = ownerBaby || await ensureBabyForOwner(openid, baby, familyId);
      await db.collection('babies').doc(ensuredBaby._id).update({
        data: {
          familyId,
          ownerOpenid: openid,
          memberOpenids: _.addToSet(openid),
          updatedAt: new Date().toISOString(),
        },
      });

      const doc = {
        _openid: openid,
        shareCode,
        familyId,
        baby: { ...baby, familyId, ownerOpenid: openid },
        babyClientId: baby.clientId || baby._id || '',
        allRecords: event.allRecords || [],
        allergyLogs: event.allergyLogs || [],
        createdAt: db.serverDate(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('family_shares').add({ data: doc });
      const babyClientId = doc.babyClientId;
      await backfillSharedItems(
        'food_records',
        event.allRecords || [],
        openid,
        openid,
        familyId,
        babyClientId
      );
      await backfillSharedItems(
        'allergy_log',
        event.allergyLogs || [],
        openid,
        openid,
        familyId,
        babyClientId
      );
      return { code: 0, data: { shareCode, familyId } };
    }

    if (op === 'preview') {
      const share = await getShareByCode(event.shareCode);
      if (!share) return { code: -1, message: 'not found' };
      return {
        code: 0,
        data: {
          shareCode: share.shareCode,
          familyId: share.familyId || '',
          babyName: share.baby && share.baby.name ? share.baby.name : '家人的宝宝',
        },
      };
    }

    if (op === 'createReport') {
      const reportCode = String(event.reportCode || '').trim().toUpperCase();
      const report = event.report || {};
      if (!reportCode || !report) return { code: -1, message: 'missing reportCode or report' };
      await db.collection('report_shares').add({
        data: {
          _openid: openid,
          reportCode,
          report,
          createdAt: db.serverDate(),
          updatedAt: new Date().toISOString(),
        },
      });
      return { code: 0, data: { reportCode } };
    }

    if (op === 'getReport') {
      const share = await getReportByCode(event.reportCode);
      if (!share) return { code: -1, message: 'not found' };
      return {
        code: 0,
        data: {
          reportCode: share.reportCode,
          report: share.report || {},
        },
      };
    }

    if (op === 'join') {
      const share = await getShareByCode(event.shareCode);
      if (!share) return { code: -1, message: 'not found' };
      const ownerOpenid = share._openid;
      const familyId = makeFamilyId(ownerOpenid, share.baby || {});
      const ownerBaby = await ensureBabyForOwner(ownerOpenid, share.baby || {}, familyId);
      const baby = ownerBaby || share.baby || {};
      const babyClientId = baby.clientId || share.babyClientId || baby._id;

      await db.collection('babies').doc(ownerBaby._id).update({
        data: {
          familyId,
          ownerOpenid,
          memberOpenids: _.addToSet(openid),
          updatedAt: new Date().toISOString(),
        },
      });

      const snapshotRecords = (share.allRecords || []).map(r => ({
        ...r,
        babyId: babyClientId,
        clientId: r.clientId || r._id,
      }));
      const snapshotLogs = (share.allergyLogs || []).map(l => ({
        ...l,
        babyId: babyClientId,
        clientId: l.clientId || l._id,
      }));

      // 邀请创建时会带一份本地快照。先回填云端,避免 owner 本地记录尚未完成云同步时,
      // 新成员拿不到完整初始进度,后续各端从不同基线开始。
      const backfilledRecords = await backfillSharedItems(
        'food_records',
        snapshotRecords,
        openid,
        ownerOpenid,
        familyId,
        babyClientId
      );
      const backfilledLogs = await backfillSharedItems(
        'allergy_log',
        snapshotLogs,
        openid,
        ownerOpenid,
        familyId,
        babyClientId
      );

      // 按 familyId 拉记录,这样能拿到所有成员写的(_openid 各自不同)
      // 同时合并 owner 旧 _openid 数据 + 调用者自己旧 _openid 数据(双向向后兼容)
      const recordWhereByFamily = { familyId, babyId: babyClientId };
      const logWhereByFamily = { familyId, babyId: babyClientId };
      const recordWhereOwner = { _openid: ownerOpenid, babyId: babyClientId };
      const logWhereOwner = { _openid: ownerOpenid, babyId: babyClientId };
      const tasks = [
        listByPages('food_records', recordWhereByFamily, 'recordTime'),
        listByPages('food_records', recordWhereOwner, 'recordTime'),
        listByPages('allergy_log', logWhereByFamily, 'occurredAt'),
        listByPages('allergy_log', logWhereOwner, 'occurredAt'),
      ];
      if (openid !== ownerOpenid) {
        tasks.push(listByPages('food_records', { _openid: openid, babyId: babyClientId }, 'recordTime'));
        tasks.push(listByPages('allergy_log', { _openid: openid, babyId: babyClientId }, 'occurredAt'));
      }
      const results = await Promise.all(tasks);
      const allRecords = dedupByClientId([backfilledRecords, snapshotRecords, results[0], results[1], results[4] || []]);
      const allergyLogs = dedupByClientId([backfilledLogs, snapshotLogs, results[2], results[3], results[5] || []]);

      return {
        code: 0,
        data: {
          baby: {
            ...baby,
            _id: babyClientId,
            clientId: babyClientId,
            familyId,
            ownerOpenid,
            sharedRole: ownerOpenid === openid ? 'owner' : 'member',
          },
          allRecords,
          allergyLogs,
        },
      };
    }

    return { code: -1, message: 'unknown op' };
  } catch (e) {
    return { code: -1, message: String(e) };
  }
};
